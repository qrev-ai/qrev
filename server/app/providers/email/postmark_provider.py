import httpx

from .types import EmailProvider, SendEmailParams, SendResult, RateLimits, EmailCredentials


class PostmarkProvider(EmailProvider):
    @property
    def id(self) -> str:
        return "postmark"

    @property
    def name(self) -> str:
        return "Postmark"

    async def send(self, params: SendEmailParams, credentials: EmailCredentials) -> SendResult:
        from_str = f"{params.from_name} <{params.from_email}>" if params.from_name else params.from_email

        payload: dict = {
            "From": from_str,
            "To": params.to_email,
            "Subject": params.subject,
        }
        if params.html:
            payload["HtmlBody"] = params.html
        if params.text:
            payload["TextBody"] = params.text
        if params.reply_to:
            payload["ReplyTo"] = params.reply_to

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.postmarkapp.com/email",
                json=payload,
                headers={
                    "X-Postmark-Server-Token": credentials.api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

        if resp.status_code == 200:
            data = resp.json()
            return SendResult(success=True, message_id=data.get("MessageID"))
        return SendResult(success=False, error=f"Postmark error {resp.status_code}: {resp.text}")

    async def validate_credentials(self, credentials: EmailCredentials) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.postmarkapp.com/server",
                    headers={
                        "X-Postmark-Server-Token": credentials.api_key,
                        "Accept": "application/json",
                    },
                )
            return resp.status_code == 200
        except Exception:
            return False

    def get_rate_limits(self) -> RateLimits:
        return RateLimits(max_per_hour=500, max_per_day=25000, min_delay_ms=50)
