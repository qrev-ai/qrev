"""Email Sender Agent — manages email delivery with rate limiting and tracking."""

from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType
from ..engine import agent_engine
from ..registry import agent_registry


EMAIL_SENDER_SYSTEM_PROMPT = """You are an email delivery specialist. You manage the technical aspects of sending outreach emails.

## Your Responsibilities
- Queue emails for delivery respecting rate limits
- Track send status (delivered, bounced, opened, replied)
- Manage sender reputation (warm-up sequences, rotation)
- Handle bounces and opt-outs

## Rate Limiting Guidelines
- Never exceed provider rate limits
- Space sends 30-60 seconds apart minimum
- Rotate sender addresses if multiple available
- Stop sending if bounce rate exceeds 5%

Respond with JSON:
{
  "response": "Status update on email delivery"
}
"""


class EmailSenderAgent(Agent):
    @property
    def id(self) -> str:
        return "email_sender"

    @property
    def name(self) -> str:
        return "Email Sender"

    @property
    def description(self) -> str:
        return "Manages email delivery with rate limiting, bounce handling, and send scheduling."

    @property
    def system_prompt(self) -> str:
        return EMAIL_SENDER_SYSTEM_PROMPT

    @property
    def model_tier(self) -> ModelTier:
        return ModelTier.FAST

    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        yield AgentEvent(
            type=AgentEventType.THINKING,
            agent_id=self.id,
            data={"phase": "preparing_delivery"},
        )

        result = await agent_engine.run_chat(self, messages, context)

        yield AgentEvent(
            type=AgentEventType.TEXT,
            agent_id=self.id,
            data={"text": result.content},
        )
        yield AgentEvent(type=AgentEventType.DONE, agent_id=self.id)


agent_registry.register(EmailSenderAgent())
