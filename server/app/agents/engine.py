"""Agent Engine — runs agents with LLM provider routing and tool execution.

This is the core runtime that:
1. Resolves the best model for an agent's tier
2. Calls the LLM with the agent's system prompt + tools
3. Executes tool calls and feeds results back
4. Tracks usage and costs
"""

import json
import logging
import re
import uuid
from typing import AsyncIterator

from app.providers.llm import llm_registry, ChatMessage, ChatParams, ChatResult
from app.providers.llm.types import ProviderCredentials, ModelTier

from .types import Agent, AgentContext, AgentEvent, AgentEventType, ToolDefinition

logger = logging.getLogger("qrev.engine")


def _new_id() -> str:
    return uuid.uuid4().hex[:24]


def _extract_json(text: str) -> dict | None:
    """Extract a JSON object from LLM output that may contain surrounding text.

    Handles: pure JSON, ```json``` code blocks, JSON embedded in narrative text,
    and JSON arrays (takes the first element).
    """
    # Try direct parse
    try:
        obj = json.loads(text)
        if isinstance(obj, list) and obj:
            return obj[0]
        if isinstance(obj, dict):
            return obj
    except (json.JSONDecodeError, ValueError):
        pass

    # Try code block
    match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if match:
        try:
            obj = json.loads(match.group(1).strip())
            if isinstance(obj, list) and obj:
                return obj[0]
            if isinstance(obj, dict):
                return obj
        except (json.JSONDecodeError, ValueError):
            pass

    # Try finding first { ... } block
    start = text.find("{")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except (json.JSONDecodeError, ValueError):
                        break

    # Try finding first [ ... ] block (JSON array)
    start = text.find("[")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "[":
                depth += 1
            elif text[i] == "]":
                depth -= 1
                if depth == 0:
                    try:
                        arr = json.loads(text[start : i + 1])
                        if isinstance(arr, list) and arr:
                            return arr[0]
                    except (json.JSONDecodeError, ValueError):
                        break

    return None


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
        has_called_tool = False

        for iteration in range(max_iterations):
            yield AgentEvent(
                type=AgentEventType.THINKING,
                agent_id=agent.id,
                data={"iteration": iteration, "model": model_id},
            )

            params = ChatParams(model=model_id, messages=conversation, json_mode=True)
            result = await provider.chat(params, credentials)

            logger.info(
                "[%s] iteration=%d response=%s",
                agent.id, iteration, result.content[:200],
            )

            # Extract JSON from the response (handles text-wrapped JSON,
            # code blocks, and JSON arrays — Anthropic doesn't support json_mode)
            parsed = _extract_json(result.content)

            if parsed is not None:
                # Convention: {"tool": "name", "input": {...}} means tool call
                if "tool" in parsed and parsed["tool"] in tools_map:
                    tool_name = parsed["tool"]
                    tool_input = parsed.get("input", {})
                    has_called_tool = True

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

                    result_payload: dict = {"tool_result": tool_name, "output": tool_result}

                    # If the tool failed, add an explicit signal so the LLM
                    # doesn't hallucinate success
                    if isinstance(tool_result, dict) and tool_result.get("success") is False:
                        result_payload["IMPORTANT"] = (
                            "The tool call FAILED. Report this failure to the user. "
                            "Do NOT claim the action succeeded."
                        )

                    conversation.append(
                        ChatMessage(
                            role="user",
                            content=json.dumps(result_payload),
                        )
                    )
                    continue

                # Convention: {"response": "..."} means final answer
                if "response" in parsed:
                    # Guard: if agent has tools but hasn't used any yet,
                    # reject and tell LLM to actually use its tools
                    if tools_map and not has_called_tool:
                        logger.warning(
                            "[%s] LLM tried to respond without calling any tools, "
                            "pushing back (iteration %d)", agent.id, iteration,
                        )
                        tool_names = ", ".join(tools_map.keys())
                        conversation.append(
                            ChatMessage(role="assistant", content=result.content)
                        )
                        conversation.append(
                            ChatMessage(
                                role="user",
                                content=json.dumps({
                                    "error": "You must use your tools before responding. "
                                    f"You have NOT performed any action yet. "
                                    f"Call one of your tools: {tool_names}",
                                }),
                            )
                        )
                        continue

                    yield AgentEvent(
                        type=AgentEventType.TEXT,
                        agent_id=agent.id,
                        data={"text": parsed["response"]},
                    )
                    break

            # If no JSON found or no recognized structure, treat as final text
            if tools_map and not has_called_tool:
                # Agent has tools but returned plain text — push back
                logger.warning(
                    "[%s] No JSON found, pushing back to use tools (iteration %d)",
                    agent.id, iteration,
                )
                tool_names = ", ".join(tools_map.keys())
                conversation.append(
                    ChatMessage(role="assistant", content=result.content)
                )
                conversation.append(
                    ChatMessage(
                        role="user",
                        content=json.dumps({
                            "error": "Invalid response format. You MUST respond with JSON. "
                            f"Call one of your tools: {tool_names}. "
                            'Format: {"tool": "tool_name", "input": {...}}',
                        }),
                    )
                )
                continue

            yield AgentEvent(
                type=AgentEventType.TEXT,
                agent_id=agent.id,
                data={"text": result.content},
            )
            break

        yield AgentEvent(type=AgentEventType.DONE, agent_id=agent.id)


# Singleton engine
agent_engine = AgentEngine()
