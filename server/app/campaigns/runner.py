"""Campaign Runner — background loop that processes scheduled email sends.

Runs as an asyncio task inside the FastAPI process. Polls the database every
60 seconds for CampaignProspect rows where nextSendAt <= now() and status
is appropriate, then sends emails via the email_sender agent tools.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta

from sqlalchemy import text

from app.db.session import async_session
from app.providers.credentials import decrypt_credentials
from app.providers.email import email_registry
from app.providers.email.types import EmailCredentials, SendEmailParams

logger = logging.getLogger("qrev.campaign_runner")

# How often to check for due sends (seconds)
POLL_INTERVAL = 60

# Min seconds between sends to respect rate limits
SEND_SPACING = 30

# Max bounce rate before pausing a campaign
MAX_BOUNCE_RATE = 0.05


class CampaignRunner:
    """Background campaign execution engine."""

    def __init__(self):
        self._task: asyncio.Task | None = None
        self._running = False

    def start(self):
        """Start the background campaign runner."""
        if self._task and not self._task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Campaign runner started")

    def stop(self):
        """Stop the background campaign runner."""
        self._running = False
        if self._task:
            self._task.cancel()
            logger.info("Campaign runner stopped")

    async def _run_loop(self):
        """Main polling loop."""
        while self._running:
            try:
                await self._process_due_sends()
            except Exception:
                logger.exception("Error in campaign runner loop")

            await asyncio.sleep(POLL_INTERVAL)

    async def _process_due_sends(self):
        """Find and process all due campaign sends."""
        async with async_session() as db:
            # Find CampaignProspect rows due for sending
            result = await db.execute(
                text("""
                    SELECT cp.id, cp."campaignId", cp."prospectId", cp."currentStep",
                           cp."personalizedEmails",
                           p.email, p."firstName", p."lastName", p.company,
                           c."workspaceId", c.status as campaign_status
                    FROM "CampaignProspect" cp
                    JOIN "Prospect" p ON p.id = cp."prospectId"
                    JOIN "Campaign" c ON c.id = cp."campaignId"
                    WHERE cp."nextSendAt" <= :now
                      AND cp.status IN ('PENDING', 'READY')
                      AND c.status = 'ACTIVE'
                    ORDER BY cp."nextSendAt"
                    LIMIT 50
                """),
                {"now": datetime.utcnow()},
            )
            due_sends = result.mappings().all()

        if not due_sends:
            return

        logger.info(f"Processing {len(due_sends)} due campaign sends")

        for send in due_sends:
            if not self._running:
                break

            try:
                await self._execute_send(dict(send))
                # Rate limiting spacing between sends
                await asyncio.sleep(SEND_SPACING)
            except Exception:
                logger.exception(f"Failed to send for CampaignProspect {send['id']}")
                await self._mark_failed(send["id"])

    async def _execute_send(self, send: dict):
        """Execute a single email send for a campaign prospect."""
        workspace_id = send["workspaceId"]
        campaign_prospect_id = send["id"]
        current_step = send["currentStep"]

        # Get the email provider for this workspace
        async with async_session() as db:
            result = await db.execute(
                text("""
                    SELECT id, provider_id, credentials_encrypted, nonce
                    FROM provider_credentials
                    WHERE workspace_id = :wid
                      AND provider_type = 'email'
                      AND is_active = true
                      AND is_valid = true
                    LIMIT 1
                """),
                {"wid": workspace_id},
            )
            provider_row = result.mappings().first()

        if not provider_row:
            logger.warning(f"No email provider for workspace {workspace_id}, skipping")
            return

        provider = email_registry.get(provider_row["provider_id"])
        if not provider:
            logger.warning(f"Unknown email provider: {provider_row['provider_id']}")
            return

        raw_creds = decrypt_credentials(
            provider_row["credentials_encrypted"], provider_row["nonce"]
        )
        credentials = EmailCredentials(**raw_creds)

        # Get the campaign step template
        async with async_session() as db:
            result = await db.execute(
                text("""
                    SELECT "subjectTemplate", "bodyTemplate"
                    FROM "CampaignStep"
                    WHERE "campaignId" = :cid AND "stepNumber" = :step
                """),
                {"cid": send["campaignId"], "step": current_step + 1},
            )
            step_row = result.mappings().first()

        if not step_row:
            # No more steps — mark as completed
            await self._mark_completed(campaign_prospect_id)
            return

        # Personalize the email with prospect data
        subject = self._personalize(step_row["subjectTemplate"], send)
        body = self._personalize(step_row["bodyTemplate"], send)

        # Check if we have pre-personalized emails from the email_writer agent
        personalized = send.get("personalizedEmails")
        if personalized:
            try:
                emails = json.loads(personalized) if isinstance(personalized, str) else personalized
                if isinstance(emails, list) and len(emails) > current_step:
                    step_email = emails[current_step]
                    subject = step_email.get("subject", subject)
                    body = step_email.get("body", body)
            except (json.JSONDecodeError, TypeError, IndexError):
                pass

        # Send the email
        params = SendEmailParams(
            from_email="noreply@qrev.ai",
            from_name="QRev",
            to_email=send["email"],
            subject=subject,
            html=body,
        )
        send_result = await provider.send(params, credentials)

        if send_result.success:
            await self._advance_step(
                campaign_prospect_id, send["campaignId"], current_step
            )
            logger.info(
                f"Sent step {current_step + 1} to {send['email']} "
                f"(campaign_prospect={campaign_prospect_id})"
            )
        else:
            if "bounce" in (send_result.error or "").lower():
                await self._mark_bounced(campaign_prospect_id)
                await self._check_bounce_rate(send["campaignId"])
            else:
                logger.error(
                    f"Send failed for {send['email']}: {send_result.error}"
                )
                # Retry later — push nextSendAt forward by 1 hour
                await self._retry_later(campaign_prospect_id, hours=1)

    def _personalize(self, template: str, prospect: dict) -> str:
        """Simple template personalization with prospect data."""
        replacements = {
            "{{firstName}}": prospect.get("firstName") or "",
            "{{lastName}}": prospect.get("lastName") or "",
            "{{company}}": prospect.get("company") or "",
            "{{email}}": prospect.get("email") or "",
        }
        result = template
        for key, value in replacements.items():
            result = result.replace(key, value)
        return result

    async def _advance_step(
        self, campaign_prospect_id: str, campaign_id: str, current_step: int
    ):
        """Move prospect to next step or mark as completed."""
        async with async_session() as db:
            # Check if there's a next step
            result = await db.execute(
                text("""
                    SELECT "stepNumber", "delayDays"
                    FROM "CampaignStep"
                    WHERE "campaignId" = :cid AND "stepNumber" = :next_step
                """),
                {"cid": campaign_id, "next_step": current_step + 2},
            )
            next_step = result.mappings().first()

            if next_step:
                delay_days = next_step["delayDays"] or 3
                next_send = datetime.utcnow() + timedelta(days=delay_days)
                await db.execute(
                    text("""
                        UPDATE "CampaignProspect"
                        SET "currentStep" = :step,
                            "lastSentAt" = :now,
                            "nextSendAt" = :next_send,
                            status = 'READY',
                            "updatedAt" = :now
                        WHERE id = :id
                    """),
                    {
                        "id": campaign_prospect_id,
                        "step": current_step + 1,
                        "now": datetime.utcnow(),
                        "next_send": next_send,
                    },
                )
            else:
                await db.execute(
                    text("""
                        UPDATE "CampaignProspect"
                        SET "currentStep" = :step,
                            "lastSentAt" = :now,
                            "nextSendAt" = NULL,
                            status = 'SENT',
                            "updatedAt" = :now
                        WHERE id = :id
                    """),
                    {
                        "id": campaign_prospect_id,
                        "step": current_step + 1,
                        "now": datetime.utcnow(),
                    },
                )
            await db.commit()

    async def _mark_completed(self, campaign_prospect_id: str):
        async with async_session() as db:
            await db.execute(
                text("""
                    UPDATE "CampaignProspect"
                    SET status = 'SENT', "nextSendAt" = NULL, "updatedAt" = :now
                    WHERE id = :id
                """),
                {"id": campaign_prospect_id, "now": datetime.utcnow()},
            )
            await db.commit()

    async def _mark_failed(self, campaign_prospect_id: str):
        async with async_session() as db:
            await db.execute(
                text("""
                    UPDATE "CampaignProspect"
                    SET "nextSendAt" = NULL, "updatedAt" = :now
                    WHERE id = :id
                """),
                {"id": campaign_prospect_id, "now": datetime.utcnow()},
            )
            await db.commit()

    async def _mark_bounced(self, campaign_prospect_id: str):
        async with async_session() as db:
            await db.execute(
                text("""
                    UPDATE "CampaignProspect"
                    SET status = 'BOUNCED', "nextSendAt" = NULL, "updatedAt" = :now
                    WHERE id = :id
                """),
                {"id": campaign_prospect_id, "now": datetime.utcnow()},
            )
            await db.commit()

    async def _retry_later(self, campaign_prospect_id: str, hours: int = 1):
        async with async_session() as db:
            await db.execute(
                text("""
                    UPDATE "CampaignProspect"
                    SET "nextSendAt" = :next, "updatedAt" = :now
                    WHERE id = :id
                """),
                {
                    "id": campaign_prospect_id,
                    "now": datetime.utcnow(),
                    "next": datetime.utcnow() + timedelta(hours=hours),
                },
            )
            await db.commit()

    async def _check_bounce_rate(self, campaign_id: str):
        """Pause campaign if bounce rate exceeds threshold."""
        async with async_session() as db:
            result = await db.execute(
                text("""
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'BOUNCED') as bounced,
                        COUNT(*) FILTER (WHERE status IN ('SENT', 'BOUNCED', 'REPLIED')) as total_sent
                    FROM "CampaignProspect"
                    WHERE "campaignId" = :cid
                """),
                {"cid": campaign_id},
            )
            row = result.mappings().first()

            total = row["total_sent"] or 0
            bounced = row["bounced"] or 0

            if total >= 10 and (bounced / total) > MAX_BOUNCE_RATE:
                await db.execute(
                    text("""
                        UPDATE "Campaign"
                        SET status = 'PAUSED', "updatedAt" = :now
                        WHERE id = :cid
                    """),
                    {"cid": campaign_id, "now": datetime.utcnow()},
                )
                await db.commit()
                logger.warning(
                    f"Campaign {campaign_id} paused: bounce rate "
                    f"{bounced}/{total} = {bounced/total:.1%} exceeds {MAX_BOUNCE_RATE:.0%}"
                )


# Singleton
campaign_runner = CampaignRunner()
