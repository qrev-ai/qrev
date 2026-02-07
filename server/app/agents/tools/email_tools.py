"""Email tools — agents use these to send emails via connected providers.

Token lifecycle:
  - On every send, check if the access_token is within 60s of expiry.
  - If so, use the refresh_token to obtain a new access_token from Google.
  - Persist the refreshed token + new expires_at back to the DB so
    subsequent calls skip the refresh roundtrip.
  - The Gmail provider itself is stateless — it receives a valid token.
"""

import logging
import os
import time

import httpx
from sqlalchemy import text

from app.db.session import async_session
from app.providers.credentials import decrypt_credentials, encrypt_credentials
from app.providers.email import email_registry
from app.providers.email.types import EmailCredentials, SendEmailParams

logger = logging.getLogger("qrev.email_tools")

# Buffer before expiry at which we proactively refresh (seconds)
_REFRESH_BUFFER_SECS = 60


async def _refresh_google_token(
    refresh_token: str,
    client_id: str,
    client_secret: str,
) -> tuple[str, int] | None:
    """Exchange a refresh_token for a fresh access_token.

    Returns (new_access_token, expires_at_epoch) or None on failure.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
    if resp.status_code != 200:
        logger.error("Google token refresh failed: %s", resp.text)
        return None

    data = resp.json()
    new_token = data["access_token"]
    expires_at = int(time.time()) + data.get("expires_in", 3600)
    return new_token, expires_at


def _token_is_fresh(expires_at: int | None) -> bool:
    """True if the token still has > _REFRESH_BUFFER_SECS of life left."""
    if not expires_at:
        return False
    return expires_at > time.time() + _REFRESH_BUFFER_SECS


# ── OAuth fallback: read Gmail tokens from NextAuth Account table ────


async def _get_gmail_from_oauth(workspace_id: str) -> tuple[EmailCredentials, str] | None:
    """Read Google OAuth tokens from the NextAuth Account table.

    If the access_token is expired, refresh it and write the new token
    back to the Account row so future calls don't need to refresh.

    Returns (credentials, from_email) or None.
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")

    async with async_session() as db:
        row = (await db.execute(
            text("""
                SELECT a.id AS account_id,
                       a.access_token, a.refresh_token, a.expires_at,
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

        access_token = row["access_token"]
        refresh_token = row.get("refresh_token")
        expires_at = row.get("expires_at")
        account_id = row["account_id"]
        user_email = row.get("email") or "noreply@qrev.ai"

        # Refresh if token is stale
        if not _token_is_fresh(expires_at) and refresh_token and client_id and client_secret:
            refreshed = await _refresh_google_token(refresh_token, client_id, client_secret)
            if refreshed:
                access_token, expires_at = refreshed
                # Persist back to Account table
                await db.execute(
                    text("""
                        UPDATE "Account"
                        SET access_token = :token, expires_at = :exp
                        WHERE id = :aid
                    """),
                    {"token": access_token, "exp": expires_at, "aid": account_id},
                )
                await db.commit()
                logger.info("Refreshed and persisted Gmail token for account %s", account_id)
            else:
                logger.warning("Token refresh failed, using existing token for account %s", account_id)

    credentials = EmailCredentials(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        client_id=client_id,
        client_secret=client_secret,
    )
    return credentials, user_email


# ── Explicit provider: read from provider_credentials table ──────────


async def _get_explicit_provider(workspace_id: str) -> tuple[EmailCredentials, str, str] | None:
    """Read encrypted credentials from the provider_credentials table.

    If it's a Gmail provider with an expired token, refresh and persist.

    Returns (credentials, from_email, provider_id) or None.
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")

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
        if not row:
            return None

        raw_creds = decrypt_credentials(row["credentials_encrypted"], row["nonce"])
        provider_id = row["provider_id"]
        cred_id = row["id"]

        # If Gmail provider, handle token refresh
        if provider_id == "gmail":
            access_token = raw_creds.get("access_token")
            refresh_token = raw_creds.get("refresh_token")
            expires_at = raw_creds.get("expires_at")
            cid = raw_creds.get("client_id") or client_id
            csec = raw_creds.get("client_secret") or client_secret

            if not _token_is_fresh(expires_at) and refresh_token and cid and csec:
                refreshed = await _refresh_google_token(refresh_token, cid, csec)
                if refreshed:
                    raw_creds["access_token"], raw_creds["expires_at"] = refreshed
                    # Re-encrypt and persist
                    ciphertext, nonce = encrypt_credentials(raw_creds)
                    await db.execute(
                        text("""
                            UPDATE provider_credentials
                            SET credentials_encrypted = :ct, nonce = :n, updated_at = NOW()
                            WHERE id = :cid
                        """),
                        {"ct": ciphertext, "n": nonce, "cid": cred_id},
                    )
                    await db.commit()
                    logger.info("Refreshed and persisted Gmail token for credential %s", cred_id)

        credentials = EmailCredentials(**raw_creds)
        sender_email = raw_creds.get("email") or "noreply@qrev.ai"
        return credentials, sender_email, provider_id


# ── Public tool functions ────────────────────────────────────────────


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

    # 1. Try explicit provider_credentials
    explicit = await _get_explicit_provider(workspace_id)
    if explicit:
        credentials, sender_email, provider_id = explicit
        provider = email_registry.get(provider_id)
        if not provider:
            return {"success": False, "error": f"Unknown email provider: {provider_id}"}
        sender_email = from_email or sender_email
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
