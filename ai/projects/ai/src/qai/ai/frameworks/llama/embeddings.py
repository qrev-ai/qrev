from enum import StrEnum
from typing import TypeVar

from llama_index.core.base.embeddings.base import (
    DEFAULT_EMBED_BATCH_SIZE,
    BaseEmbedding,
    Embedding,
)

C = TypeVar("C", bound="BaseEmbedding")


class EmbeddingName(StrEnum):
    hf_bge_small_en_v1_5 = "BAAI/bge-small-en-v1.5"
    openai_default = "openai_default"
    openai_davinci = "DAVINCI"
    openai_curie = "CURIE"
    openai_babbage = "BABBAGE"
    openai_ada = "ADA"
    openai_text_embed_ada_002 = "TEXT_EMBED_ADA_002"

    def short_name(self):
        if self == EmbeddingName.hf_bge_small_en_v1_5:
            return "hf_v1_5"
        return str(self).lower()


def get_embedding(model_name: EmbeddingName = None, **kwargs) -> BaseEmbedding:
    if not model_name:
        model_name = EmbeddingName.openai_default
    if model_name == EmbeddingName.hf_bge_small_en_v1_5:
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding

        return HuggingFaceEmbedding(model_name=model_name)
    elif model_name == EmbeddingName.openai_default:
        from llama_index.embeddings.openai import OpenAIEmbedding

        # - OpenAIEmbeddingMode.SIMILARITY_MODE
        # - OpenAIEmbeddingMode.TEXT_SEARCH_MODE
        if EmbeddingName.openai_default == model_name:
            return OpenAIEmbedding(**kwargs)
        else:
            return OpenAIEmbedding(name=model_name, **kwargs)
