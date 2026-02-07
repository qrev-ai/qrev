"""Email tools — agents use these to send emails via connected providers."""

import logging
import os

from sqlalchemy import text

from app.db.session import async_session
from app.providers.credentials import decrypt_credentials
from app.providers.email import email_registry
from app.providers.email.types import EmailCredentials, SendEmailParams

logger = logging.getLogger("qrev.email_tools")


async def _get_gmail_from_oauth(workspace_id: str) -> tuple[EmailCredentials, str] | None:
    """Fall back to NextAuth Account table for Gmail OAuth tokens.

    Looks up a Google Account linked to a user in the workspace.
    Returns (credentials, from_email) or None.
    """
    async with async_session() as db:
        row = (await db.execute(
            text("""
                SELECT a.access_token, a.refresh_token, a.expires_at,
                       a.scope, u.email
                FROM "Account" a
                JOIN "WorkspaceMember" wm ON wm."userId" = a."userId"
                JOIN "User" u ON u.id = a."userId"
                WHERE wm."workspaceId" = :wid
                  AND a.provider = 'google'
                  AND a.access_token IS NOT NULL
                LIMIT 1
            """),
            {"wid": workspace_id},
        )).mappings().first()

    if not row:
        return None

    scope = row.get("scope") or ""
    if "gmail.send" not in scope:
        logger.info("Google account found but missing gmail.send scope")
        return None

    credentials = EmailCredentials(
        access_token=row["access_token"],
        refresh_token=row.get("refresh_token"),
        expires_at=row.get("expires_at"),
        client_id=os.environ.get("GOOGLE_CLIENT_ID", ""),
        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET", ""),
    )
    return credentials, row.get("email") or "noreply@qrev.ai"


async def send_email(
    workspace_id: str,
    to_email: str,
    subject: str,
    body_html: str,
    from_email: str | None = None,
    from_name: str | None = None,
    **kwargs,
) -> dict:
    """Send an email using the workspace's connected email provider."""
    # 1. Check for explicit email provider in provider_credentials
    async with async_session() as db:
        result = await db.execute(
            text("""
                SELECT id, provider_id, credentials_encrypted, nonce
                FROM provider_credentials
                WHERE workspace_id = :wid
                  AND provider_type = 'EMAIL'
                  AND is_active = true
                  AND is_valid = true
                LIMIT 1
            """),
            {"wid": workspace_id},
        )
        row = result.mappings().first()

    if row:
        provider = email_registry.get(row["provider_id"])
        if not provider:
            return {"success": False, "error": f"Unknown email provider: {row['provider_id']}"}

        raw_creds = decrypt_credentials(row["credentials_encrypted"], row["nonce"])
        credentials = EmailCredentials(**raw_creds)
        sender_email = from_email or raw_creds.get("email") or "noreply@qrev.ai"
    else:
        # 2. Fall back to Gmail OAuth from NextAuth Account table
        oauth = await _get_gmail_from_oauth(workspace_id)
        if not oauth:
            return {
                "success": False,
                "error": (
                    "No email provider connected. "
                    "Please log in with Google (with Gmail permissions) "
                    "or connect an email provider in Settings > Apps."
                ),
            }

        credentials, user_email = oauth
        sender_email = from_email or user_email
        provider = email_registry.get("gmail")
        if not provider:
            return {"success": False, "error": "Gmail provider not registered"}
        logger.info("Using Gmail OAuth from login for workspace %s", workspace_id)

    params = SendEmailParams(
        from_email=sender_email,
        from_name=from_name or "QRev",
        to_email=to_email,
        subject=subject,
        html=body_html,
    )

    result = await provider.send(params, credentials)
    return {
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
    }


async def check_email_provider(
    workspace_id: str,
    **kwargs,
) -> dict:
    """Check if the workspace has a connected and valid email provider."""
    # Check explicit providers
    async with async_session() as db:
        result = await db.execute(
            text("""
                SELECT provider_id, is_valid
                FROM provider_credentials
                WHERE workspace_id = :wid
                  AND provider_type = 'EMAIL'
                  AND is_active = true
            """),
            {"wid": workspace_id},
        )
        rows = result.mappings().all()

    if rows:
        return {
            "connected": True,
            "providers": [
                {"id": r["provider_id"], "valid": r["is_valid"]}
                for r in rows
            ],
        }

    # Fall back to Gmail OAuth
    oauth = await _get_gmail_from_oauth(workspace_id)
    if oauth:
        return {
            "connected": True,
            "providers": [{"id": "gmail", "valid": True, "source": "google_login"}],
        }

    return {"connected": False, "providers": []}
