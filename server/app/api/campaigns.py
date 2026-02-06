"""Campaign API — activate, pause, and manage campaign execution."""

from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.db.session import async_session

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class ActivateCampaignRequest(BaseModel):
    campaign_id: str


class PauseCampaignRequest(BaseModel):
    campaign_id: str


@router.post("/activate")
async def activate_campaign(req: ActivateCampaignRequest):
    """Activate a campaign — starts scheduling sends for its prospects."""
    async with async_session() as db:
        # Verify campaign exists and is in DRAFT or PAUSED state
        result = await db.execute(
            text("""
                SELECT id, status, "workspaceId"
                FROM "Campaign"
                WHERE id = :cid
            """),
            {"cid": req.campaign_id},
        )
        campaign = result.mappings().first()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        if campaign["status"] not in ("DRAFT", "PAUSED"):
            raise HTTPException(
                status_code=400,
                detail=f"Campaign is already {campaign['status']}",
            )

        # Check that the workspace has an email provider
        result = await db.execute(
            text("""
                SELECT COUNT(*) as cnt
                FROM provider_credentials
                WHERE workspace_id = :wid
                  AND provider_type = 'email'
                  AND is_active = true
                  AND is_valid = true
            """),
            {"wid": campaign["workspaceId"]},
        )
        row = result.mappings().first()
        if not row or row["cnt"] == 0:
            raise HTTPException(
                status_code=400,
                detail="No email provider connected. Go to Settings > Providers first.",
            )

        # Check campaign has at least one step
        result = await db.execute(
            text("""
                SELECT COUNT(*) as cnt FROM "CampaignStep"
                WHERE "campaignId" = :cid
            """),
            {"cid": req.campaign_id},
        )
        step_count = result.mappings().first()
        if not step_count or step_count["cnt"] == 0:
            raise HTTPException(
                status_code=400,
                detail="Campaign has no steps. Add at least one email step.",
            )

        # Activate the campaign
        await db.execute(
            text("""
                UPDATE "Campaign"
                SET status = 'ACTIVE', "updatedAt" = :now
                WHERE id = :cid
            """),
            {"cid": req.campaign_id, "now": datetime.utcnow()},
        )

        # Schedule first send for prospects that don't have a nextSendAt yet
        await db.execute(
            text("""
                UPDATE "CampaignProspect"
                SET "nextSendAt" = :now,
                    status = 'READY',
                    "updatedAt" = :now
                WHERE "campaignId" = :cid
                  AND status = 'PENDING'
                  AND "nextSendAt" IS NULL
            """),
            {"cid": req.campaign_id, "now": datetime.utcnow()},
        )

        await db.commit()

    return {"success": True, "status": "ACTIVE"}


@router.post("/pause")
async def pause_campaign(req: PauseCampaignRequest):
    """Pause a campaign — stops all scheduled sends."""
    async with async_session() as db:
        result = await db.execute(
            text("""SELECT id, status FROM "Campaign" WHERE id = :cid"""),
            {"cid": req.campaign_id},
        )
        campaign = result.mappings().first()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        if campaign["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400, detail="Campaign is not active"
            )

        await db.execute(
            text("""
                UPDATE "Campaign"
                SET status = 'PAUSED', "updatedAt" = :now
                WHERE id = :cid
            """),
            {"cid": req.campaign_id, "now": datetime.utcnow()},
        )

        await db.commit()

    return {"success": True, "status": "PAUSED"}


@router.get("/{campaign_id}/status")
async def campaign_status(campaign_id: str):
    """Get campaign execution status with prospect breakdown."""
    async with async_session() as db:
        result = await db.execute(
            text("""SELECT id, name, status FROM "Campaign" WHERE id = :cid"""),
            {"cid": campaign_id},
        )
        campaign = result.mappings().first()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Get prospect status breakdown
        result = await db.execute(
            text("""
                SELECT
                    status,
                    COUNT(*) as count
                FROM "CampaignProspect"
                WHERE "campaignId" = :cid
                GROUP BY status
            """),
            {"cid": campaign_id},
        )
        status_rows = result.mappings().all()
        breakdown = {row["status"]: row["count"] for row in status_rows}

        # Get next scheduled send
        result = await db.execute(
            text("""
                SELECT MIN("nextSendAt") as next_send
                FROM "CampaignProspect"
                WHERE "campaignId" = :cid AND "nextSendAt" IS NOT NULL
            """),
            {"cid": campaign_id},
        )
        next_row = result.mappings().first()

    return {
        "campaign_id": campaign_id,
        "name": campaign["name"],
        "status": campaign["status"],
        "prospect_breakdown": breakdown,
        "total_prospects": sum(breakdown.values()),
        "next_scheduled_send": next_row["next_send"] if next_row else None,
    }
