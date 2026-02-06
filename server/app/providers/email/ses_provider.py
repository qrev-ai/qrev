import json
import hashlib
import hmac
import datetime
from urllib.parse import quote

import httpx

from .types import EmailProvider, SendEmailParams, SendResult, RateLimits, EmailCredentials


class SESProvider(EmailProvider):
    """Amazon SES provider using the REST API with AWS Signature V4.

    Credentials needed: access_key_id, secret_access_key, region.
    No boto3 dependency — we sign requests ourselves to keep deps light.
    """

    @property
    def id(self) -> str:
        return "ses"

    @property
    def name(self) -> str:
        return "Amazon SES"

    async def send(self, params: SendEmailParams, credentials: EmailCredentials) -> SendResult:
        region = credentials.region or "us-east-1"
        host = f"email.{region}.amazonaws.com"

        from_str = f"{params.from_name} <{params.from_email}>" if params.from_name else params.from_email

        # Build SES SendEmail query parameters
        query_params = {
            "Action": "SendEmail",
            "Source": from_str,
            "Destination.ToAddresses.member.1": params.to_email,
            "Message.Subject.Data": params.subject,
        }
        if params.html:
            query_params["Message.Body.Html.Data"] = params.html
        if params.text:
            query_params["Message.Body.Text.Data"] = params.text
        if params.reply_to:
            query_params["ReplyToAddresses.member.1"] = params.reply_to

        body = "&".join(f"{quote(k, safe='')}={quote(v, safe='')}" for k, v in query_params.items())

        now = datetime.datetime.utcnow()
        headers = self._sign_request(
            "POST", host, "/", body, credentials, region, now
        )
        headers["Content-Type"] = "application/x-www-form-urlencoded"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://{host}/",
                content=body,
                headers=headers,
            )

        if resp.status_code == 200:
            # Parse message ID from XML response
            text = resp.text
            msg_id = ""
            if "<MessageId>" in text:
                msg_id = text.split("<MessageId>")[1].split("</MessageId>")[0]
            return SendResult(success=True, message_id=msg_id)
        return SendResult(success=False, error=f"SES error {resp.status_code}: {resp.text}")

    async def validate_credentials(self, credentials: EmailCredentials) -> bool:
        """Validate by calling GetSendQuota."""
        try:
            region = credentials.region or "us-east-1"
            host = f"email.{region}.amazonaws.com"
            body = "Action=GetSendQuota"

            now = datetime.datetime.utcnow()
            headers = self._sign_request(
                "POST", host, "/", body, credentials, region, now
            )
            headers["Content-Type"] = "application/x-www-form-urlencoded"

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://{host}/",
                    content=body,
                    headers=headers,
                )
            return resp.status_code == 200
        except Exception:
            return False

    def get_rate_limits(self) -> RateLimits:
        # SES default sandbox limits — production accounts have much higher limits
        return RateLimits(max_per_hour=200, max_per_day=50000, min_delay_ms=100)

    # ── AWS Signature V4 ─────────────────────────────────

    def _sign_request(
        self,
        method: str,
        host: str,
        path: str,
        body: str,
        credentials: EmailCredentials,
        region: str,
        now: datetime.datetime,
    ) -> dict[str, str]:
        service = "ses"
        datestamp = now.strftime("%Y%m%d")
        amzdate = now.strftime("%Y%m%dT%H%M%SZ")

        canonical_headers = f"host:{host}\nx-amz-date:{amzdate}\n"
        signed_headers = "host;x-amz-date"

        payload_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
        canonical_request = f"{method}\n{path}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}"

        credential_scope = f"{datestamp}/{region}/{service}/aws4_request"
        string_to_sign = (
            f"AWS4-HMAC-SHA256\n{amzdate}\n{credential_scope}\n"
            + hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
        )

        def _hmac(key: bytes, msg: str) -> bytes:
            return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

        signing_key = _hmac(
            _hmac(
                _hmac(
                    _hmac(f"AWS4{credentials.secret_access_key}".encode("utf-8"), datestamp),
                    region,
                ),
                service,
            ),
            "aws4_request",
        )

        signature = hmac.new(
            signing_key, string_to_sign.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        authorization = (
            f"AWS4-HMAC-SHA256 Credential={credentials.access_key_id}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        )

        return {
            "x-amz-date": amzdate,
            "Authorization": authorization,
        }
