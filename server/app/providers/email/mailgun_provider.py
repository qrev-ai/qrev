import httpx

from .types import EmailProvider, SendEmailParams, SendResult, RateLimits, EmailCredentials


class MailgunProvider(EmailProvider):
    @property
    def id(self) -> str:
        return "mailgun"

    @property
    def name(self) -> str:
        return "Mailgun"

    async def send(self, params: SendEmailParams, credentials: EmailCredentials) -> SendResult:
        # Mailgun API key format: "key-xxxxx", domain is stored alongside
        domain = credentials.domain or "mg.example.com"
        from_str = f"{params.from_name} <{params.from_email}>" if params.from_name else params.from_email

        data = {
            "from": from_str,
            "to": [params.to_email],
            "subject": params.subject,
        }
        if params.html:
            data["html"] = params.html
        if params.text:
            data["text"] = params.text
        if params.reply_to:
            data["h:Reply-To"] = params.reply_to

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.mailgun.net/v3/{domain}/messages",
                auth=("api", credentials.api_key),
                data=data,
            )

        if resp.status_code == 200:
            body = resp.json()
            return SendResult(success=True, message_id=body.get("id"))
        return SendResult(success=False, error=f"Mailgun error {resp.status_code}: {resp.text}")

    async def validate_credentials(self, credentials: EmailCredentials) -> bool:
        try:
            domain = credentials.domain or "mg.example.com"
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"https://api.mailgun.net/v3/{domain}",
                    auth=("api", credentials.api_key),
                )
            return resp.status_code == 200
        except Exception:
            return False

    def get_rate_limits(self) -> RateLimits:
        return RateLimits(max_per_hour=500, max_per_day=10000, min_delay_ms=100)
