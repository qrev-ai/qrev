from .types import EmailProvider
from .sendgrid_provider import SendGridProvider
from .resend_provider import ResendProvider
from .mailgun_provider import MailgunProvider
from .ses_provider import SESProvider
from .postmark_provider import PostmarkProvider
from .gmail_provider import GmailProvider


class EmailRegistry:
    """Registry of all available email sending providers."""

    def __init__(self) -> None:
        self._providers: dict[str, EmailProvider] = {}

    def register(self, provider: EmailProvider) -> None:
        self._providers[provider.id] = provider

    def get(self, provider_id: str) -> EmailProvider | None:
        return self._providers.get(provider_id)

    @property
    def providers(self) -> dict[str, EmailProvider]:
        return dict(self._providers)


# Singleton registry with built-in providers
email_registry = EmailRegistry()
email_registry.register(SendGridProvider())
email_registry.register(ResendProvider())
email_registry.register(MailgunProvider())
email_registry.register(SESProvider())
email_registry.register(PostmarkProvider())
email_registry.register(GmailProvider())
