import httpx

from .types import EmailProvider, SendEmailParams, SendResult, RateLimits, EmailCredentials


class SendGridProvider(EmailProvider):
    @property
    def id(self) -> str:
        return "sendgrid"

    @property
    def name(self) -> str:
        return "SendGrid"

    async def send(self, params: SendEmailParams, credentials: EmailCredentials) -> SendResult:
        payload = {
            "personalizations": [{"to": [{"email": params.to_email}]}],
            "from": {"email": params.from_email},
            "subject": params.subject,
            "content": [],
        }
        if params.from_name:
            payload["from"]["name"] = params.from_name
        if params.to_name:
            payload["personalizations"][0]["to"][0]["name"] = params.to_name
        if params.reply_to:
            payload["reply_to"] = {"email": params.reply_to}
        if params.text:
            payload["content"].append({"type": "text/plain", "value": params.text})
        if params.html:
            payload["content"].append({"type": "text/html", "value": params.html})

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={
                    "Authorization": f"Bearer {credentials.api_key}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code in (200, 201, 202):
            msg_id = resp.headers.get("X-Message-Id")
            return SendResult(success=True, message_id=msg_id)
        return SendResult(success=False, error=f"SendGrid error {resp.status_code}: {resp.text}")

    async def validate_credentials(self, credentials: EmailCredentials) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.sendgrid.com/v3/scopes",
                    headers={"Authorization": f"Bearer {credentials.api_key}"},
                )
            return resp.status_code == 200
        except Exception:
            return False

    def get_rate_limits(self) -> RateLimits:
        return RateLimits(max_per_hour=500, max_per_day=10000, min_delay_ms=100)
