from typing import AsyncIterator

import anthropic

from .types import (
    LLMProvider,
    ModelDefinition,
    ModelTier,
    ModelCapability,
    ChatParams,
    ChatChunk,
    ChatResult,
    ProviderCredentials,
)

ANTHROPIC_MODELS = [
    ModelDefinition(
        id="claude-opus-4-6",
        name="Claude Opus 4.6",
        provider="anthropic",
        context_window=1_000_000,
        input_cost_per_1m=15.0,
        output_cost_per_1m=75.0,
        capabilities=[
            ModelCapability.CHAT,
            ModelCapability.JSON,
            ModelCapability.VISION,
            ModelCapability.STREAMING,
            ModelCapability.TOOL_USE,
        ],
        tier=ModelTier.PREMIUM,
    ),
    ModelDefinition(
        id="claude-sonnet-4-5-20250929",
        name="Claude Sonnet 4.5",
        provider="anthropic",
        context_window=200_000,
        input_cost_per_1m=3.0,
        output_cost_per_1m=15.0,
        capabilities=[
            ModelCapability.CHAT,
            ModelCapability.JSON,
            ModelCapability.VISION,
            ModelCapability.STREAMING,
            ModelCapability.TOOL_USE,
        ],
        tier=ModelTier.BALANCED,
    ),
    ModelDefinition(
        id="claude-haiku-4-5-20251001",
        name="Claude Haiku 4.5",
        provider="anthropic",
        context_window=200_000,
        input_cost_per_1m=0.8,
        output_cost_per_1m=4.0,
        capabilities=[
            ModelCapability.CHAT,
            ModelCapability.JSON,
            ModelCapability.VISION,
            ModelCapability.STREAMING,
            ModelCapability.TOOL_USE,
        ],
        tier=ModelTier.FAST,
    ),
]


def _build_client(credentials: ProviderCredentials) -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(
        api_key=credentials.api_key,
        **({"base_url": credentials.base_url} if credentials.base_url else {}),
    )


class AnthropicProvider(LLMProvider):
    @property
    def id(self) -> str:
        return "anthropic"

    @property
    def name(self) -> str:
        return "Anthropic"

    @property
    def models(self) -> list[ModelDefinition]:
        return ANTHROPIC_MODELS

    async def chat(self, params: ChatParams, credentials: ProviderCredentials) -> ChatResult:
        client = _build_client(credentials)

        # Anthropic separates system prompt from messages
        system_prompt = ""
        messages = []
        for m in params.messages:
            if m.role == "system":
                system_prompt += m.content + "\n"
            else:
                messages.append({"role": m.role, "content": m.content})

        kwargs: dict = {
            "model": params.model,
            "messages": messages,
            "max_tokens": params.max_tokens or 4096,
        }
        if system_prompt.strip():
            kwargs["system"] = system_prompt.strip()
        if params.temperature is not None:
            kwargs["temperature"] = params.temperature

        response = await client.messages.create(**kwargs)
        content = ""
        for block in response.content:
            if block.type == "text":
                content += block.text

        return ChatResult(
            content=content,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )

    async def chat_stream(
        self, params: ChatParams, credentials: ProviderCredentials
    ) -> AsyncIterator[ChatChunk]:
        client = _build_client(credentials)

        system_prompt = ""
        messages = []
        for m in params.messages:
            if m.role == "system":
                system_prompt += m.content + "\n"
            else:
                messages.append({"role": m.role, "content": m.content})

        kwargs: dict = {
            "model": params.model,
            "messages": messages,
            "max_tokens": params.max_tokens or 4096,
        }
        if system_prompt.strip():
            kwargs["system"] = system_prompt.strip()
        if params.temperature is not None:
            kwargs["temperature"] = params.temperature

        async with client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield ChatChunk(text=text, done=False)
            yield ChatChunk(text="", done=True)

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        try:
            client = _build_client(credentials)
            # Simple validation: send a minimal message
            await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=10,
                messages=[{"role": "user", "content": "hi"}],
            )
            return True
        except Exception:
            return False
