"""Email tools — agents use these to send emails via connected providers."""

from sqlalchemy import text

from app.db.session import async_session
from app.providers.credentials import decrypt_credentials
from app.providers.email import email_registry
from app.providers.email.types import EmailCredentials, SendEmailParams


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
    # Find the first active email provider for this workspace
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
        row = result.mappings().first()

    if not row:
        return {
            "success": False,
            "error": "No email provider connected. Go to Settings > Providers to connect one.",
        }

    provider = email_registry.get(row["provider_id"])
    if not provider:
        return {"success": False, "error": f"Unknown email provider: {row['provider_id']}"}

    raw_creds = decrypt_credentials(row["credentials_encrypted"], row["nonce"])
    credentials = EmailCredentials(**raw_creds)

    params = SendEmailParams(
        from_email=from_email or "noreply@qrev.ai",
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
    async with async_session() as db:
        result = await db.execute(
            text("""
                SELECT provider_id, is_valid
                FROM provider_credentials
                WHERE workspace_id = :wid
                  AND provider_type = 'email'
                  AND is_active = true
            """),
            {"wid": workspace_id},
        )
        rows = result.mappings().all()

    if not rows:
        return {"connected": False, "providers": []}

    return {
        "connected": True,
        "providers": [
            {"id": r["provider_id"], "valid": r["is_valid"]}
            for r in rows
        ],
    }
