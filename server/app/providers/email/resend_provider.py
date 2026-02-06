import httpx

from .types import EmailProvider, SendEmailParams, SendResult, RateLimits, EmailCredentials


class ResendProvider(EmailProvider):
    @property
    def id(self) -> str:
        return "resend"

    @property
    def name(self) -> str:
        return "Resend"

    async def send(self, params: SendEmailParams, credentials: EmailCredentials) -> SendResult:
        payload: dict = {
            "from": f"{params.from_name} <{params.from_email}>" if params.from_name else params.from_email,
            "to": [params.to_email],
            "subject": params.subject,
        }
        if params.html:
            payload["html"] = params.html
        if params.text:
            payload["text"] = params.text
        if params.reply_to:
            payload["reply_to"] = params.reply_to

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={
                    "Authorization": f"Bearer {credentials.api_key}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 200:
            data = resp.json()
            return SendResult(success=True, message_id=data.get("id"))
        return SendResult(success=False, error=f"Resend error {resp.status_code}: {resp.text}")

    async def validate_credentials(self, credentials: EmailCredentials) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.resend.com/domains",
                    headers={"Authorization": f"Bearer {credentials.api_key}"},
                )
            return resp.status_code == 200
        except Exception:
            return False

    def get_rate_limits(self) -> RateLimits:
        return RateLimits(max_per_hour=100, max_per_day=3000, min_delay_ms=200)
