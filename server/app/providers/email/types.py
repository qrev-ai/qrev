from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SendEmailParams:
    from_email: str
    from_name: str | None = None
    to_email: str = ""
    to_name: str | None = None
    subject: str = ""
    html: str | None = None
    text: str | None = None
    reply_to: str | None = None


@dataclass
class SendResult:
    success: bool
    message_id: str | None = None
    error: str | None = None


@dataclass
class RateLimits:
    max_per_hour: int
    max_per_day: int
    min_delay_ms: int


@dataclass
class EmailCredentials:
    api_key: str | None = None
    # Gmail OAuth
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None
    # AWS SES
    region: str | None = None
    access_key_id: str | None = None
    secret_access_key: str | None = None


class EmailProvider(ABC):
    """Abstract base class for email sending providers."""

    @property
    @abstractmethod
    def id(self) -> str: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    async def send(self, params: SendEmailParams, credentials: EmailCredentials) -> SendResult: ...

    @abstractmethod
    async def validate_credentials(self, credentials: EmailCredentials) -> bool: ...

    @abstractmethod
    def get_rate_limits(self) -> RateLimits: ...
