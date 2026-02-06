from typing import AsyncIterator

from google import genai

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

GOOGLE_MODELS = [
    ModelDefinition(
        id="gemini-2.0-flash",
        name="Gemini 2.0 Flash",
        provider="google",
        context_window=1_000_000,
        input_cost_per_1m=0.1,
        output_cost_per_1m=0.4,
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
        id="gemini-2.5-pro",
        name="Gemini 2.5 Pro",
        provider="google",
        context_window=1_000_000,
        input_cost_per_1m=1.25,
        output_cost_per_1m=10.0,
        capabilities=[
            ModelCapability.CHAT,
            ModelCapability.JSON,
            ModelCapability.VISION,
            ModelCapability.STREAMING,
            ModelCapability.TOOL_USE,
        ],
        tier=ModelTier.BALANCED,
    ),
]


def _build_client(credentials: ProviderCredentials) -> genai.Client:
    return genai.Client(api_key=credentials.api_key)


class GoogleProvider(LLMProvider):
    @property
    def id(self) -> str:
        return "google"

    @property
    def name(self) -> str:
        return "Google"

    @property
    def models(self) -> list[ModelDefinition]:
        return GOOGLE_MODELS

    async def chat(self, params: ChatParams, credentials: ProviderCredentials) -> ChatResult:
        client = _build_client(credentials)

        # Build contents from messages (Gemini uses a different format)
        system_instruction = None
        contents = []
        for m in params.messages:
            if m.role == "system":
                system_instruction = m.content
            else:
                role = "user" if m.role == "user" else "model"
                contents.append({"role": role, "parts": [{"text": m.content}]})

        config: dict = {}
        if params.max_tokens is not None:
            config["max_output_tokens"] = params.max_tokens
        if params.temperature is not None:
            config["temperature"] = params.temperature
        if system_instruction:
            config["system_instruction"] = system_instruction
        if params.json_mode:
            config["response_mime_type"] = "application/json"

        response = await client.aio.models.generate_content(
            model=params.model,
            contents=contents,
            config=config if config else None,
        )

        text = response.text or ""
        input_tokens = response.usage_metadata.prompt_token_count if response.usage_metadata else 0
        output_tokens = (
            response.usage_metadata.candidates_token_count if response.usage_metadata else 0
        )

        return ChatResult(
            content=text,
            model=params.model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )

    async def chat_stream(
        self, params: ChatParams, credentials: ProviderCredentials
    ) -> AsyncIterator[ChatChunk]:
        client = _build_client(credentials)

        system_instruction = None
        contents = []
        for m in params.messages:
            if m.role == "system":
                system_instruction = m.content
            else:
                role = "user" if m.role == "user" else "model"
                contents.append({"role": role, "parts": [{"text": m.content}]})

        config: dict = {}
        if params.max_tokens is not None:
            config["max_output_tokens"] = params.max_tokens
        if params.temperature is not None:
            config["temperature"] = params.temperature
        if system_instruction:
            config["system_instruction"] = system_instruction

        async for chunk in await client.aio.models.generate_content_stream(
            model=params.model,
            contents=contents,
            config=config if config else None,
        ):
            text = chunk.text or ""
            if text:
                yield ChatChunk(text=text, done=False)
        yield ChatChunk(text="", done=True)

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        try:
            client = _build_client(credentials)
            await client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents="hi",
                config={"max_output_tokens": 10},
            )
            return True
        except Exception:
            return False
