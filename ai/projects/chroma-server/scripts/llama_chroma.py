import glob
import os
from dataclasses import dataclass
from enum import Enum
from threading import Event, Thread

import boto3
import chromadb
from chromadb.api import ClientAPI
from chromadb.config import Settings
from llama_index.core import SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.core.base.embeddings.base import BaseEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
from pi_conf import load_config
from s3_utils import download_dir


class ChromaType(str, Enum):
    HTTP = "http"
    Ephemeral = "ephemeral"


class EmbeddingName(str, Enum):
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
    model_name = str(model_name)
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


def import_website(
    chroma_client: ClientAPI, company: str, import_path: str, collection_name: str, embed_model=None
) -> VectorStoreIndex:
    print(f"importing {company} {import_path}. Collection Name: {collection_name}", flush=True)

    chroma_collection = chroma_client.get_or_create_collection(collection_name)
    documents = SimpleDirectoryReader(import_path, recursive=True, exclude_hidden=True).load_data()
    print(f"Got # documents {len(documents)}")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    embed_model = get_embedding(embed_model)
    index = VectorStoreIndex.from_documents(
        documents, storage_context=storage_context, embed_model=embed_model
    )

    print(
        f"finished importing {collection_name}, count={chroma_collection.count()}",
        flush=True,
    )
    return index


def make_client(host: str, port: int, type: ChromaType = ChromaType.HTTP):
    try:
        print(f"Connecting to chroma host={host} port={port}", flush=True)
        if type == ChromaType.HTTP:
            s = None
            if "CHROMA_SERVER_AUTH_CREDENTIALS" in os.environ:
                s = Settings(
                    chroma_client_auth_provider="chromadb.auth.token.TokenAuthClientProvider",
                    chroma_client_auth_credentials=os.environ.get("CHROMA_SERVER_AUTH_CREDENTIALS"),
                )
            chroma_client = chromadb.HttpClient(host=host, port=port, settings=s)
        elif type == ChromaType.Ephemeral:
            chroma_client = chromadb.EphemeralClient()
    except Exception as e:
        print(e, flush=True)
        print(
            f"Error connecting to chroma host={host} port={port}, {os.environ.get('CHROMA_SERVER_AUTH_CREDENTIALS')}",
            flush=True,
        )
        raise
    return chroma_client
