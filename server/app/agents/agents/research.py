"""Research Agent — researches prospects, companies, and industries.

Has access to CRM tools (search prospects, get prospect details) and
search tools (web search, URL fetch) to gather information.
"""

import json
from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType, ToolDefinition
from ..engine import agent_engine
from ..registry import agent_registry
from ..tools import crm_tools, search_tools


RESEARCH_SYSTEM_PROMPT = """You are a research specialist for GTM teams. Your job is to research prospects and companies to enable personalized outreach.

## Available Tools
You have access to these tools. To use one, respond with JSON:
{{"tool": "tool_name", "input": {{...}}}}

- **search_prospects**: Search the CRM for prospects. Input: {{"query": "search term"}}
- **get_prospect**: Get full details for a prospect. Input: {{"prospect_id": "..."}}
- **web_search**: Search the web. Input: {{"query": "search query"}}
- **fetch_url**: Fetch content from a URL. Input: {{"url": "https://..."}}

## Research Output
When you have enough information, respond with:
{{"response": "Your structured research in markdown format"}}

Structure your research as:
1. **Company Overview**: What the company does, industry, size, recent news, funding stage
2. **Person Profile**: Role, background, likely priorities and pain points
3. **Outreach Insights**: Specific angles for personalized outreach
4. **Timing Signals**: Indicators of good timing (hiring, funding, launches)

Be specific and actionable. Avoid generic filler. If you don't know something, say so."""


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
                name="web_search",
                description="Search the web for information",
                parameters={"query": {"type": "string"}},
                handler=lambda query, **kw: search_tools.web_search(query),
            ),
            ToolDefinition(
                name="fetch_url",
                description="Fetch text content from a URL",
                parameters={"url": {"type": "string"}},
                handler=lambda url, **kw: search_tools.fetch_url(url),
            ),
        ]

    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        async for event in agent_engine.run_with_tools(self, messages, context):
            yield event


# Auto-register
agent_registry.register(ResearchAgent())
