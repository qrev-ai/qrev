"""Email Sender Agent — manages email delivery with rate limiting and tracking.

Has access to email tools (send, check provider) and CRM tools (campaign
prospects) to execute delivery with proper rate limiting.
"""

from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from ..types import Agent, AgentContext, AgentEvent, AgentEventType, ToolDefinition
from ..engine import agent_engine
from ..registry import agent_registry
from ..tools import email_tools, crm_tools


EMAIL_SENDER_SYSTEM_PROMPT = """You are an email delivery specialist. You send emails by calling tools.

## CRITICAL RULES
1. You CANNOT send emails by yourself. You MUST call the send_email tool to send any email.
2. You MUST call at least one tool before giving a final response.
3. NEVER say an email was sent unless you actually called send_email and got a success result.
4. If any tool returns "success": false, report the exact error to the user.

## How to Use Tools
Respond with JSON to call a tool:
{{"tool": "tool_name", "input": {{...}}}}

Available tools:
- **send_email**: Send an email. Input: {{"to_email": "...", "subject": "...", "body_html": "<p>...</p>", "from_name": "optional"}}
- **check_email_provider**: Check if email sending is configured. Input: {{}}
- **get_campaign_prospects**: Get prospects in a campaign. Input: {{"campaign_id": "..."}}
- **get_prospect**: Get full prospect details. Input: {{"prospect_id": "..."}}

## Workflow
1. First, call send_email with the recipient, subject, and body
2. Wait for the tool result
3. If success: report "Email sent successfully to [recipient]"
4. If failure: report the exact error message
5. If no email provider: tell user "No email provider connected. Connect Gmail in Settings > Apps."

## Final Response Format
Only after calling tools, respond with:
{{"response": "your status update based on actual tool results"}}
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

    @property
    def tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(
                name="send_email",
                description="Send an email via the connected email provider",
                parameters={
                    "to_email": {"type": "string"},
                    "subject": {"type": "string"},
                    "body_html": {"type": "string"},
                    "from_name": {"type": "string"},
                },
                handler=lambda to_email, subject, body_html, from_name=None, **kw: email_tools.send_email(
                    kw["context"].workspace_id, to_email, subject, body_html, from_name=from_name
                ),
            ),
            ToolDefinition(
                name="check_email_provider",
                description="Check if the workspace has a connected email provider",
                parameters={},
                handler=lambda **kw: email_tools.check_email_provider(
                    kw["context"].workspace_id
                ),
            ),
            ToolDefinition(
                name="get_campaign_prospects",
                description="Get all prospects in a campaign with their send status",
                parameters={"campaign_id": {"type": "string"}},
                handler=lambda campaign_id, **kw: crm_tools.get_campaign_prospects(campaign_id),
            ),
            ToolDefinition(
                name="get_prospect",
                description="Get full prospect details",
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


agent_registry.register(EmailSenderAgent())
