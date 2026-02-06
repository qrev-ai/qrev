"""Email Writer Agent — generates personalized outreach emails.

Has access to CRM tools (search prospects, get prospect details) to pull
research data and write highly personalized emails.
"""

from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType, ToolDefinition
from ..engine import agent_engine
from ..registry import agent_registry
from ..tools import crm_tools


EMAIL_WRITER_SYSTEM_PROMPT = """You are an expert email copywriter for B2B outreach. You write personalized, compelling emails that get replies.

## Available Tools
You have access to these tools. To use one, respond with JSON:
{{"tool": "tool_name", "input": {{...}}}}

- **search_prospects**: Search the CRM for prospects. Input: {{"query": "search term"}}
- **get_prospect**: Get full details for a prospect. Input: {{"prospect_id": "..."}}

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

When you have the email(s) ready, respond with:
{{"response": "Your email(s) in markdown format with subject and body clearly labeled"}}
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
        ]

    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        async for event in agent_engine.run_with_tools(self, messages, context):
            yield event


agent_registry.register(EmailWriterAgent())
