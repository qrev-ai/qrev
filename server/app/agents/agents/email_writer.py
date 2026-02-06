"""Email Writer Agent — generates personalized outreach emails."""

from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType
from ..engine import agent_engine
from ..registry import agent_registry


EMAIL_WRITER_SYSTEM_PROMPT = """You are an expert email copywriter for B2B outreach. You write personalized, compelling emails that get replies.

## Rules
- Subject lines: under 7 words, no clickbait, specific to the prospect
- No generic openers ("I hope this finds you well", "I came across your profile")
- Lead with value or a relevant observation
- One clear call to action per email
- Sound human, not robotic — write like a smart colleague, not a sales bot
- Keep emails under 150 words
- Personalize based on research data provided

## Multi-Step Sequences
When writing a sequence:
- Step 1: Initial outreach — lead with value/relevance
- Step 2: Follow-up (3-5 days later) — add new angle, reference step 1
- Step 3: Break-up (5-7 days later) — final gentle nudge, easy out

Respond with JSON:
{
  "response": "Your email(s) in markdown format with subject and body clearly labeled"
}
"""


class EmailWriterAgent(Agent):
    @property
    def id(self) -> str:
        return "email_writer"

    @property
    def name(self) -> str:
        return "Email Writer"

    @property
    def description(self) -> str:
        return "Generates personalized outreach emails and multi-step sequences."

    @property
    def system_prompt(self) -> str:
        return EMAIL_WRITER_SYSTEM_PROMPT

    @property
    def model_tier(self) -> ModelTier:
        return ModelTier.BALANCED

    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        yield AgentEvent(
            type=AgentEventType.THINKING,
            agent_id=self.id,
            data={"phase": "writing_emails"},
        )

        result = await agent_engine.run_chat(self, messages, context)

        yield AgentEvent(
            type=AgentEventType.TEXT,
            agent_id=self.id,
            data={"text": result.content},
        )
        yield AgentEvent(type=AgentEventType.DONE, agent_id=self.id)


agent_registry.register(EmailWriterAgent())
