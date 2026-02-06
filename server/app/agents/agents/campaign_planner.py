"""Campaign Planner Agent — designs multi-step outreach campaigns.

Has access to CRM tools (prospects, campaigns) to analyze the target audience
and existing campaigns when planning new ones.
"""

from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType, ToolDefinition
from ..engine import agent_engine
from ..registry import agent_registry
from ..tools import crm_tools


CAMPAIGN_PLANNER_SYSTEM_PROMPT = """You are a campaign strategist for B2B outreach. You design multi-step email campaigns that maximize reply rates.

## Available Tools
You have access to these tools. To use one, respond with JSON:
{{"tool": "tool_name", "input": {{...}}}}

- **search_prospects**: Search the CRM for prospects. Input: {{"query": "search term"}}
- **get_prospect**: Get full details for a prospect. Input: {{"prospect_id": "..."}}
- **list_campaigns**: List existing campaigns. Input: {{"status": "optional filter"}}
- **get_campaign_prospects**: Get prospects in a campaign. Input: {{"campaign_id": "..."}}

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

When you have your plan ready, respond with:
{{"response": "Your campaign plan in structured markdown"}}
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

    @property
    def tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(
                name="search_prospects",
                description="Search CRM prospects by name, email, or company",
                parameters={"query": {"type": "string"}, "limit": {"type": "integer"}},
                handler=lambda query="", limit=20, **kw: crm_tools.search_prospects(
                    kw["context"].workspace_id, query, limit
                ),
            ),
            ToolDefinition(
                name="get_prospect",
                description="Get full prospect details including research data",
                parameters={"prospect_id": {"type": "string"}},
                handler=lambda prospect_id, **kw: crm_tools.get_prospect(prospect_id),
            ),
            ToolDefinition(
                name="list_campaigns",
                description="List existing campaigns, optionally filtered by status",
                parameters={"status": {"type": "string"}},
                handler=lambda status=None, **kw: crm_tools.list_campaigns(
                    kw["context"].workspace_id, status
                ),
            ),
            ToolDefinition(
                name="get_campaign_prospects",
                description="Get all prospects in a campaign with their status",
                parameters={"campaign_id": {"type": "string"}},
                handler=lambda campaign_id, **kw: crm_tools.get_campaign_prospects(campaign_id),
            ),
        ]

    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        async for event in agent_engine.run_with_tools(self, messages, context):
            yield event


agent_registry.register(CampaignPlannerAgent())
