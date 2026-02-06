"""QAi Orchestrator — the super-agent that delegates to specialized sub-agents.

Follows Anthropic's orchestrator-worker pattern:
- QAi uses a premium model for planning and synthesis
- Sub-agents use balanced/fast models for execution
- Shared task list for coordination
- Parallel sub-agent execution where possible

Anthropic's research shows: Opus lead + Sonnet workers outperforms single Opus by 90%.
"""

import asyncio
import json
import re
from typing import AsyncIterator

from app.providers.llm.types import ModelTier, ChatMessage

from .types import Agent, AgentContext, AgentEvent, AgentEventType
from .engine import agent_engine
from .registry import agent_registry


def _extract_json(text: str) -> dict | None:
    """Extract JSON from LLM response, handling code blocks and surrounding text."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from ```json ... ``` code block
    match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
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
                    except json.JSONDecodeError:
                        break

    return None


ORCHESTRATOR_SYSTEM_PROMPT = """You are QAi, the lead AI orchestrator for a GTM (Go-To-Market) platform.

Your job is to understand user requests and delegate work to specialized sub-agents.
You plan, coordinate, and synthesize results.

## Available Sub-Agents

{agent_descriptions}

## How to Respond

Analyze the user's request and respond with JSON in one of these formats:

### Direct response (no delegation needed):
{{"response": "your helpful response here"}}

### Delegate to sub-agents:
{{
  "plan": "Brief description of your plan",
  "tasks": [
    {{
      "agent": "agent_id",
      "objective": "Clear description of what this agent should do",
      "depends_on": []
    }}
  ]
}}

### Synthesize results (after sub-agents complete):
{{"response": "Synthesized answer combining all results"}}

## Guidelines
- For simple questions, respond directly
- For complex GTM tasks (campaigns, research, outreach), delegate to sub-agents
- Run independent tasks in parallel (empty depends_on)
- Use depends_on to chain sequential tasks
- Always explain your plan to the user before executing
- Scale effort to complexity: simple fact → direct response, campaign setup → multiple agents
"""


class QAiOrchestrator(Agent):
    @property
    def id(self) -> str:
        return "qai"

    @property
    def name(self) -> str:
        return "QAi"

    @property
    def description(self) -> str:
        return "Lead orchestrator that plans and delegates GTM tasks to specialized agents."

    @property
    def system_prompt(self) -> str:
        agents = agent_registry.list_agents()
        # Exclude self from the list
        sub_agents = [a for a in agents if a["id"] != "qai"]
        descriptions = "\n".join(
            f"- **{a['name']}** (`{a['id']}`): {a['description']}"
            for a in sub_agents
        )
        return ORCHESTRATOR_SYSTEM_PROMPT.format(agent_descriptions=descriptions)

    @property
    def model_tier(self) -> ModelTier:
        return ModelTier.PREMIUM

    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        """Run the orchestrator. Plans work, delegates to sub-agents, synthesizes results."""

        # Step 1: Ask the lead model to plan
        yield AgentEvent(
            type=AgentEventType.THINKING,
            agent_id=self.id,
            data={"phase": "planning"},
        )

        result = await agent_engine.run_chat(self, messages, context)

        parsed = _extract_json(result.content)
        if parsed is None:
            # Not JSON — treat as direct text response
            yield AgentEvent(
                type=AgentEventType.TEXT,
                agent_id=self.id,
                data={"text": result.content},
            )
            yield AgentEvent(type=AgentEventType.DONE, agent_id=self.id)
            return

        # Case 1: Direct response
        if "response" in parsed:
            yield AgentEvent(
                type=AgentEventType.TEXT,
                agent_id=self.id,
                data={"text": parsed["response"]},
            )
            yield AgentEvent(type=AgentEventType.DONE, agent_id=self.id)
            return

        # Case 2: Delegation plan
        if "tasks" in parsed:
            plan = parsed.get("plan", "Working on your request...")
            tasks = parsed["tasks"]

            yield AgentEvent(
                type=AgentEventType.TEXT,
                agent_id=self.id,
                data={"text": f"**Plan:** {plan}\n\nSpawning {len(tasks)} agent(s)..."},
            )

            # Execute tasks (parallel where possible)
            results = await self._execute_tasks(tasks, messages, context)

            # Step 3: Synthesize
            yield AgentEvent(
                type=AgentEventType.THINKING,
                agent_id=self.id,
                data={"phase": "synthesizing"},
            )

            synthesis = await self._synthesize(messages, tasks, results, context)

            yield AgentEvent(
                type=AgentEventType.TEXT,
                agent_id=self.id,
                data={"text": synthesis},
            )

        yield AgentEvent(type=AgentEventType.DONE, agent_id=self.id)

    async def _execute_tasks(
        self,
        tasks: list[dict],
        original_messages: list[ChatMessage],
        context: AgentContext,
    ) -> dict[int, str]:
        """Execute sub-agent tasks, respecting dependencies."""
        results: dict[int, str] = {}
        completed: set[int] = set()

        # Build dependency graph
        while len(completed) < len(tasks):
            # Find tasks ready to run (all dependencies met)
            ready = []
            for i, task in enumerate(tasks):
                if i in completed:
                    continue
                deps = task.get("depends_on", [])
                if all(d in completed for d in deps):
                    ready.append(i)

            if not ready:
                break  # Deadlock protection

            # Run ready tasks in parallel
            async def _run_one(idx: int) -> tuple[int, str]:
                task = tasks[idx]
                agent = agent_registry.get(task["agent"])
                if not agent:
                    return idx, f"Error: unknown agent '{task['agent']}'"

                if context.emit:
                    await context.emit(AgentEvent(
                        type=AgentEventType.SUB_AGENT,
                        agent_id=self.id,
                        data={"sub_agent": agent.id, "objective": task["objective"]},
                    ))

                # Give the sub-agent the objective as a user message
                sub_messages = [
                    ChatMessage(role="user", content=task["objective"])
                ]

                # Include results from dependencies as context
                dep_context = ""
                for dep_idx in task.get("depends_on", []):
                    if dep_idx in results:
                        dep_context += f"\n\nResult from previous task: {results[dep_idx]}"
                if dep_context:
                    sub_messages[0] = ChatMessage(
                        role="user",
                        content=task["objective"] + dep_context,
                    )

                result = await agent_engine.run_chat(agent, sub_messages, context)
                return idx, result.content

            parallel_results = await asyncio.gather(
                *[_run_one(i) for i in ready],
                return_exceptions=True,
            )

            for res in parallel_results:
                if isinstance(res, Exception):
                    continue
                idx, content = res
                results[idx] = content
                completed.add(idx)

        return results

    async def _synthesize(
        self,
        original_messages: list[ChatMessage],
        tasks: list[dict],
        results: dict[int, str],
        context: AgentContext,
    ) -> str:
        """Have the lead model synthesize sub-agent results into a final response."""
        results_text = ""
        for i, task in enumerate(tasks):
            result = results.get(i, "No result")
            results_text += f"\n\n### {task['agent']}: {task['objective']}\n{result}"

        synthesis_messages = list(original_messages) + [
            ChatMessage(
                role="user",
                content=(
                    f"Sub-agents have completed their work. Here are the results:{results_text}\n\n"
                    "Synthesize these results into a clear, actionable response for the user. "
                    "Format nicely with markdown. Respond with JSON: {\"response\": \"...\"}"
                ),
            ),
        ]

        result = await agent_engine.run_chat(self, synthesis_messages, context)
        try:
            parsed = json.loads(result.content)
            return parsed.get("response", result.content)
        except json.JSONDecodeError:
            return result.content
