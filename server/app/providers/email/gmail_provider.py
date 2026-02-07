"""Gmail API provider — sends emails via Google's Gmail REST API.

Stateless sender: receives a *valid* access_token and uses it.
Token refresh + persistence is handled upstream in email_tools.py.
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
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                    headers={"Authorization": f"Bearer {credentials.access_token}"},
                )
            return resp.status_code == 200
        except Exception:
            return False

    def get_rate_limits(self) -> RateLimits:
        return RateLimits(max_per_hour=100, max_per_day=2000, min_delay_ms=500)
