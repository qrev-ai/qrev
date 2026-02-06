"""Research Agent — researches prospects, companies, and industries."""

from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType
from ..engine import agent_engine
from ..registry import agent_registry


RESEARCH_SYSTEM_PROMPT = """You are a research specialist for GTM teams. Your job is to research prospects and companies to enable personalized outreach.

When researching, provide:
1. **Company Overview**: What the company does, industry, size, recent news, funding stage
2. **Person Profile**: Role, background, likely priorities and pain points
3. **Outreach Insights**: Specific angles for personalized outreach (recent achievements, shared connections, company initiatives)
4. **Timing Signals**: Any indicators of good timing (hiring, funding, product launches, org changes)

Be specific and actionable. Avoid generic filler. If you don't know something, say so rather than making it up.

Respond with JSON:
{"response": "Your structured research in markdown format"}
"""


class ResearchAgent(Agent):
    @property
    def id(self) -> str:
        return "research"

    @property
    def name(self) -> str:
        return "Research Agent"

    @property
    def description(self) -> str:
        return "Researches prospects, companies, and industries to inform outreach strategy."

    @property
    def system_prompt(self) -> str:
        return RESEARCH_SYSTEM_PROMPT

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
            data={"phase": "researching"},
        )

        result = await agent_engine.run_chat(self, messages, context)

        yield AgentEvent(
            type=AgentEventType.TEXT,
            agent_id=self.id,
            data={"text": result.content},
        )
        yield AgentEvent(type=AgentEventType.DONE, agent_id=self.id)


# Auto-register
agent_registry.register(ResearchAgent())
