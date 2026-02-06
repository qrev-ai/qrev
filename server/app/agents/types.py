"""Core types for the agent framework."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, Callable, Awaitable

from app.providers.llm.types import ModelTier, ChatMessage


class AgentEventType(str, Enum):
    THINKING = "thinking"       # Agent is planning
    TOOL_CALL = "tool_call"     # Agent invoked a tool
    TOOL_RESULT = "tool_result" # Tool returned a result
    TEXT = "text"               # Streaming text output
    SUB_AGENT = "sub_agent"     # Spawned a sub-agent
    DONE = "done"               # Agent finished
    ERROR = "error"             # Agent hit an error


@dataclass
class AgentEvent:
    type: AgentEventType
    agent_id: str
    data: dict = field(default_factory=dict)


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict  # JSON Schema for input
    handler: Callable[..., Awaitable[Any]]


@dataclass
class AgentContext:
    workspace_id: str
    session_id: str
    # Resolved credentials for this workspace
    llm_credentials: dict[str, Any] = field(default_factory=dict)  # provider_id -> credentials
    email_credentials: dict[str, Any] = field(default_factory=dict)
    # Callback to emit events to the caller
    emit: Callable[[AgentEvent], Awaitable[None]] | None = None


class Agent(ABC):
    """Base class for all QREV agents."""

    @property
    @abstractmethod
    def id(self) -> str:
        """Unique agent identifier (e.g. 'research', 'email_writer')."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """What this agent does — used by the orchestrator to decide delegation."""
        ...

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """System prompt for this agent's LLM calls."""
        ...

    @property
    def model_tier(self) -> ModelTier:
        """Which model tier this agent needs. Override for premium agents."""
        return ModelTier.BALANCED

    @property
    def tools(self) -> list[ToolDefinition]:
        """Tools available to this agent. Override to add tools."""
        return []

    @abstractmethod
    async def run(
        self,
        messages: list[ChatMessage],
        context: AgentContext,
    ) -> AsyncIterator[AgentEvent]:
        """Execute the agent. Yields events as it works."""
        ...
