from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator


class ModelTier(str, Enum):
    FAST = "fast"
    BALANCED = "balanced"
    PREMIUM = "premium"


class ModelCapability(str, Enum):
    CHAT = "chat"
    JSON = "json"
    VISION = "vision"
    STREAMING = "streaming"
    TOOL_USE = "tool_use"


@dataclass
class ModelDefinition:
    id: str                              # e.g. "gpt-4o", "claude-opus-4-6"
    name: str                            # Human-readable
    provider: str                        # e.g. "openai", "anthropic"
    context_window: int
    input_cost_per_1m: float             # USD per 1M input tokens
    output_cost_per_1m: float            # USD per 1M output tokens
    capabilities: list[ModelCapability]
    tier: ModelTier


@dataclass
class ChatMessage:
    role: str   # "user", "assistant", "system"
    content: str


@dataclass
class ChatParams:
    model: str
    messages: list[ChatMessage]
    stream: bool = False
    json_mode: bool = False
    max_tokens: int | None = None
    temperature: float | None = None


@dataclass
class ChatChunk:
    text: str
    done: bool


@dataclass
class ChatResult:
    content: str
    model: str
    input_tokens: int
    output_tokens: int


@dataclass
class ProviderCredentials:
    api_key: str | None = None
    base_url: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @property
    @abstractmethod
    def id(self) -> str: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def models(self) -> list[ModelDefinition]: ...

    @abstractmethod
    async def chat(self, params: ChatParams, credentials: ProviderCredentials) -> ChatResult: ...

    @abstractmethod
    async def chat_stream(
        self, params: ChatParams, credentials: ProviderCredentials
    ) -> AsyncIterator[ChatChunk]: ...

    @abstractmethod
    async def validate_credentials(self, credentials: ProviderCredentials) -> bool: ...

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        model_def = next((m for m in self.models if m.id == model), None)
        if not model_def:
            return 0.0
        return (
            (input_tokens / 1_000_000) * model_def.input_cost_per_1m
            + (output_tokens / 1_000_000) * model_def.output_cost_per_1m
        )

    def get_model(self, model_id: str) -> ModelDefinition | None:
        return next((m for m in self.models if m.id == model_id), None)
