"""Gmail API provider — sends emails via Google's Gmail REST API.

Credentials needed: access_token (and optionally refresh_token + client_id +
client_secret for automatic token refresh).

Users authorize via OAuth2 in the frontend, which stores the tokens encrypted.
"""

import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx

from .types import EmailProvider, SendEmailParams, SendResult, RateLimits, EmailCredentials


class GmailProvider(EmailProvider):
    @property
    def id(self) -> str:
        return "gmail"

    @property
    def name(self) -> str:
        return "Gmail API"

    async def send(self, params: SendEmailParams, credentials: EmailCredentials) -> SendResult:
        access_token = credentials.access_token
        if not access_token:
            return SendResult(success=False, error="No access token. Re-authorize Gmail.")

        # Refresh token if we have refresh credentials
        access_token = await self._ensure_token(credentials)

        # Build MIME message
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{params.from_name} <{params.from_email}>" if params.from_name else params.from_email
        msg["To"] = params.to_email
        msg["Subject"] = params.subject
        if params.reply_to:
            msg["Reply-To"] = params.reply_to

        if params.text:
            msg.attach(MIMEText(params.text, "plain"))
        if params.html:
            msg.attach(MIMEText(params.html, "html"))

        # Base64url encode
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                json={"raw": raw},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 200:
            data = resp.json()
            return SendResult(success=True, message_id=data.get("id"))
        return SendResult(success=False, error=f"Gmail error {resp.status_code}: {resp.text}")

    async def validate_credentials(self, credentials: EmailCredentials) -> bool:
        try:
            access_token = await self._ensure_token(credentials)
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            return resp.status_code == 200
        except Exception:
            return False

    def get_rate_limits(self) -> RateLimits:
        # Gmail API default quotas
        return RateLimits(max_per_hour=100, max_per_day=2000, min_delay_ms=500)

    async def _ensure_token(self, credentials: EmailCredentials) -> str:
        """Refresh the access token if a refresh_token is available and token may be expired."""
        if not credentials.refresh_token:
            return credentials.access_token or ""

        # Check if token is expired (if expires_at is set)
        import time
        if credentials.expires_at and credentials.expires_at > time.time() + 60:
            return credentials.access_token or ""

        # Refresh
        client_id = credentials.client_id or ""
        client_secret = credentials.client_secret or ""

        if not client_id or not client_secret:
            return credentials.access_token or ""

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": credentials.refresh_token,
                    "grant_type": "refresh_token",
                },
            )

        if resp.status_code == 200:
            data = resp.json()
            # Update credentials in-place for this request
            credentials.access_token = data["access_token"]
            credentials.expires_at = int(time.time()) + data.get("expires_in", 3600)
            return data["access_token"]

        return credentials.access_token or ""
