"""Campaign Planner Agent — designs multi-step outreach campaigns."""

from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType
from ..engine import agent_engine
from ..registry import agent_registry


CAMPAIGN_PLANNER_SYSTEM_PROMPT = """You are a campaign strategist for B2B outreach. You design multi-step email campaigns that maximize reply rates.

## Your Capabilities
- Design campaign sequences (timing, number of steps, themes per step)
- Suggest A/B test variants for subject lines and messaging angles
- Recommend optimal send times based on persona
- Plan campaign targeting and segmentation

## Campaign Design Principles
- 3-step sequences work best for cold outreach
- Step 1: Day 0 — Value-led introduction
- Step 2: Day 3-5 — New angle, social proof
- Step 3: Day 7-10 — Break-up email with easy out
- Send between 8-10 AM recipient's local time (Tuesday-Thursday optimal)
- Personalization > volume — 50 well-targeted prospects beat 500 generic ones

Respond with JSON:
{
  "response": "Your campaign plan in structured markdown"
}
"""


class CampaignPlannerAgent(Agent):
    @property
    def id(self) -> str:
        return "campaign_planner"

    @property
    def name(self) -> str:
        return "Campaign Planner"

    @property
    def description(self) -> str:
        return "Designs multi-step outreach campaigns with timing, sequencing, and A/B testing strategies."

    @property
    def system_prompt(self) -> str:
        return CAMPAIGN_PLANNER_SYSTEM_PROMPT

    @property
    def model_tier(self) -> ModelTier:
        return ModelTier.PREMIUM

    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        yield AgentEvent(
            type=AgentEventType.THINKING,
            agent_id=self.id,
            data={"phase": "planning_campaign"},
        )

        result = await agent_engine.run_chat(self, messages, context)

        yield AgentEvent(
            type=AgentEventType.TEXT,
            agent_id=self.id,
            data={"text": result.content},
        )
        yield AgentEvent(type=AgentEventType.DONE, agent_id=self.id)


agent_registry.register(CampaignPlannerAgent())
