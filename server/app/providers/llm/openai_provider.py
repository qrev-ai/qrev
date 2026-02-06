from typing import AsyncIterator

import openai

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

OPENAI_MODELS = [
    ModelDefinition(
        id="gpt-4o",
        name="GPT-4o",
        provider="openai",
        context_window=128_000,
        input_cost_per_1m=2.5,
        output_cost_per_1m=10.0,
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
        id="gpt-4o-mini",
        name="GPT-4o Mini",
        provider="openai",
        context_window=128_000,
        input_cost_per_1m=0.15,
        output_cost_per_1m=0.6,
        capabilities=[
            ModelCapability.CHAT,
            ModelCapability.JSON,
            ModelCapability.VISION,
            ModelCapability.STREAMING,
            ModelCapability.TOOL_USE,
        ],
        tier=ModelTier.FAST,
    ),
    ModelDefinition(
        id="o3-mini",
        name="o3-mini",
        provider="openai",
        context_window=200_000,
        input_cost_per_1m=1.1,
        output_cost_per_1m=4.4,
        capabilities=[
            ModelCapability.CHAT,
            ModelCapability.JSON,
            ModelCapability.STREAMING,
            ModelCapability.TOOL_USE,
        ],
        tier=ModelTier.BALANCED,
    ),
]


def _build_client(credentials: ProviderCredentials) -> openai.AsyncOpenAI:
    return openai.AsyncOpenAI(
        api_key=credentials.api_key,
        **({"base_url": credentials.base_url} if credentials.base_url else {}),
    )


class OpenAIProvider(LLMProvider):
    @property
    def id(self) -> str:
        return "openai"

    @property
    def name(self) -> str:
        return "OpenAI"

    @property
    def models(self) -> list[ModelDefinition]:
        return OPENAI_MODELS

    async def chat(self, params: ChatParams, credentials: ProviderCredentials) -> ChatResult:
        client = _build_client(credentials)
        messages = [{"role": m.role, "content": m.content} for m in params.messages]

        kwargs: dict = {"model": params.model, "messages": messages}
        if params.json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        if params.max_tokens is not None:
            kwargs["max_tokens"] = params.max_tokens
        if params.temperature is not None:
            kwargs["temperature"] = params.temperature

        response = await client.chat.completions.create(**kwargs)
        return ChatResult(
            content=response.choices[0].message.content or "",
            model=response.model,
            input_tokens=response.usage.prompt_tokens if response.usage else 0,
            output_tokens=response.usage.completion_tokens if response.usage else 0,
        )

    async def chat_stream(
        self, params: ChatParams, credentials: ProviderCredentials
    ) -> AsyncIterator[ChatChunk]:
        client = _build_client(credentials)
        messages = [{"role": m.role, "content": m.content} for m in params.messages]

        kwargs: dict = {
            "model": params.model,
            "messages": messages,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if params.json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        if params.max_tokens is not None:
            kwargs["max_tokens"] = params.max_tokens
        if params.temperature is not None:
            kwargs["temperature"] = params.temperature

        stream = await client.chat.completions.create(**kwargs)
        async for chunk in stream:
            text = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else ""
            done = bool(chunk.choices and chunk.choices[0].finish_reason)
            if text or done:
                yield ChatChunk(text=text or "", done=done)

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        try:
            client = _build_client(credentials)
            await client.models.list()
            return True
        except Exception:
            return False
