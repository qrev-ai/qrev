"""LLM Provider Registry and Model Router.

Manages all registered LLM providers and routes requests to the
best model based on tier, cost, and availability.
"""

from .types import (
    LLMProvider,
    ModelDefinition,
    ModelTier,
    ChatParams,
    ChatChunk,
    ChatResult,
    ProviderCredentials,
)
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .google_provider import GoogleProvider


class LLMRegistry:
    """Registry of all available LLM providers."""

    def __init__(self) -> None:
        self._providers: dict[str, LLMProvider] = {}

    def register(self, provider: LLMProvider) -> None:
        self._providers[provider.id] = provider

    def get(self, provider_id: str) -> LLMProvider | None:
        return self._providers.get(provider_id)

    @property
    def providers(self) -> dict[str, LLMProvider]:
        return dict(self._providers)

    def all_models(self) -> list[ModelDefinition]:
        models = []
        for provider in self._providers.values():
            models.extend(provider.models)
        return models

    def find_model(self, model_id: str) -> tuple[LLMProvider, ModelDefinition] | None:
        """Find a model across all providers. Returns (provider, model) or None."""
        for provider in self._providers.values():
            model = provider.get_model(model_id)
            if model:
                return provider, model
        return None

    def models_by_tier(self, tier: ModelTier) -> list[ModelDefinition]:
        return [m for m in self.all_models() if m.tier == tier]

    def select_model(
        self,
        tier: ModelTier,
        available_provider_ids: list[str] | None = None,
    ) -> ModelDefinition | None:
        """Select the best model for a tier, optionally filtered to specific providers.

        Returns the cheapest model in the requested tier from available providers.
        """
        candidates = self.models_by_tier(tier)
        if available_provider_ids:
            candidates = [m for m in candidates if m.provider in available_provider_ids]
        if not candidates:
            return None
        # Sort by total cost (input + output) ascending
        candidates.sort(key=lambda m: m.input_cost_per_1m + m.output_cost_per_1m)
        return candidates[0]


# Singleton registry with built-in providers
llm_registry = LLMRegistry()
llm_registry.register(OpenAIProvider())
llm_registry.register(AnthropicProvider())
llm_registry.register(GoogleProvider())
