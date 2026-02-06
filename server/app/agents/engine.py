"""Agent Engine — runs agents with LLM provider routing and tool execution.

This is the core runtime that:
1. Resolves the best model for an agent's tier
2. Calls the LLM with the agent's system prompt + tools
3. Executes tool calls and feeds results back
4. Tracks usage and costs
"""

import json
import uuid
from typing import AsyncIterator

from app.providers.llm import llm_registry, ChatMessage, ChatParams, ChatResult
from app.providers.llm.types import ProviderCredentials, ModelTier

from .types import Agent, AgentContext, AgentEvent, AgentEventType, ToolDefinition


def _new_id() -> str:
    return uuid.uuid4().hex[:24]


class AgentEngine:
    """Runs a single agent with its tools against an LLM."""

    async def resolve_model(
        self,
        tier: ModelTier,
        context: AgentContext,
    ) -> tuple[str, str, ProviderCredentials]:
        """Pick the best model for the tier from available workspace credentials.

        Returns (provider_id, model_id, credentials).
        """
        available_providers = list(context.llm_credentials.keys())
        model = llm_registry.select_model(tier, available_providers)
        if not model:
            raise ValueError(
                f"No LLM provider available for tier '{tier.value}'. "
                f"Connected providers: {available_providers}"
            )
        creds_dict = context.llm_credentials[model.provider]
        credentials = ProviderCredentials(**creds_dict) if isinstance(creds_dict, dict) else creds_dict
        return model.provider, model.id, credentials

    async def run_chat(
        self,
        agent: Agent,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> ChatResult:
        """Single non-streaming LLM call for an agent."""
        provider_id, model_id, credentials = await self.resolve_model(
            agent.model_tier, context
        )
        provider = llm_registry.get(provider_id)

        all_messages = [ChatMessage(role="system", content=agent.system_prompt)] + messages

        params = ChatParams(model=model_id, messages=all_messages)
        result = await provider.chat(params, credentials)

        return result

    async def run_chat_stream(
        self,
        agent: Agent,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[str]:
        """Streaming LLM call for an agent. Yields text chunks."""
        provider_id, model_id, credentials = await self.resolve_model(
            agent.model_tier, context
        )
        provider = llm_registry.get(provider_id)

        all_messages = [ChatMessage(role="system", content=agent.system_prompt)] + messages

        params = ChatParams(model=model_id, messages=all_messages, stream=True)
        async for chunk in provider.chat_stream(params, credentials):
            if chunk.text:
                yield chunk.text

    async def run_with_tools(
        self,
        agent: Agent,
        messages: list[ChatMessage],
        context: AgentContext,
        max_iterations: int = 10,
    ) -> AsyncIterator[AgentEvent]:
        """Run an agent in a tool-use loop.

        The agent can call tools, get results, and continue until it produces
        a final text response or hits max_iterations.
        """
        provider_id, model_id, credentials = await self.resolve_model(
            agent.model_tier, context
        )
        provider = llm_registry.get(provider_id)

        conversation = [ChatMessage(role="system", content=agent.system_prompt)] + list(messages)

        tools_map = {t.name: t for t in agent.tools}

        for iteration in range(max_iterations):
            yield AgentEvent(
                type=AgentEventType.THINKING,
                agent_id=agent.id,
                data={"iteration": iteration, "model": model_id},
            )

            params = ChatParams(model=model_id, messages=conversation, json_mode=True)
            result = await provider.chat(params, credentials)

            # Try to parse as JSON to detect tool calls
            try:
                parsed = json.loads(result.content)

                # Convention: {"tool": "name", "input": {...}} means tool call
                if "tool" in parsed and parsed["tool"] in tools_map:
                    tool_name = parsed["tool"]
                    tool_input = parsed.get("input", {})

                    yield AgentEvent(
                        type=AgentEventType.TOOL_CALL,
                        agent_id=agent.id,
                        data={"tool": tool_name, "input": tool_input},
                    )

                    tool = tools_map[tool_name]
                    tool_result = await tool.handler(**tool_input, context=context)

                    yield AgentEvent(
                        type=AgentEventType.TOOL_RESULT,
                        agent_id=agent.id,
                        data={"tool": tool_name, "result": tool_result},
                    )

                    # Feed result back into conversation
                    conversation.append(ChatMessage(role="assistant", content=result.content))
                    conversation.append(
                        ChatMessage(
                            role="user",
                            content=json.dumps({"tool_result": tool_name, "output": tool_result}),
                        )
                    )
                    continue

                # Convention: {"response": "..."} means final answer
                if "response" in parsed:
                    yield AgentEvent(
                        type=AgentEventType.TEXT,
                        agent_id=agent.id,
                        data={"text": parsed["response"]},
                    )
                    break

            except (json.JSONDecodeError, KeyError):
                pass

            # If not JSON or no tool call, treat as final text response
            yield AgentEvent(
                type=AgentEventType.TEXT,
                agent_id=agent.id,
                data={"text": result.content},
            )
            break

        yield AgentEvent(type=AgentEventType.DONE, agent_id=agent.id)


# Singleton engine
agent_engine = AgentEngine()
