# %%
#!wget "https://www.dropbox.com/s/f6bmb19xdg0xedm/paul_graham_essay.txt?dl=1" -O paul_graham_essay.txt
# %%

import getpass
import logging
import os
import random
import re
import shutil
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import chromadb
from chromadb.api import AdminAPI, ClientAPI
from chromadb.config import Settings
from langchain_community.embeddings.huggingface import HuggingFaceEmbeddings
from llama_index.agent.openai import OpenAIAgent
from llama_index.core import SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.core.base.base_retriever import BaseRetriever
from llama_index.core.llama_pack import download_llama_pack
from llama_index.core.tools import QueryEngineTool, ToolMetadata
from llama_index.core.vector_stores.types import MetadataInfo, VectorStoreInfo
from llama_index.llms.openai import OpenAI
from llama_index.vector_stores.chroma import ChromaVectorStore
from pi_log import get_app_logger, getLogger
from qai.storage.llama.openai_llm import CustomOpenAI
from qai.storage.retriever import Retriever

from .embeddings import EmbeddingName, get_embedding

log = getLogger(__name__)
print(f" app logger name: {get_app_logger().name}, logger name: {log.name}")


@dataclass
class LlamaChromaCollection(chromadb.Collection):
    company: str
    source: str
    time_str: str
    embed_model: str


@dataclass
class LlamaChromaConfig:
    host: str = None
    port: str = None
    embed_model_params: dict = field(
        # default_factory=lambda: {"model_name": "BAAI/bge-base-en-v1.5"}
        default_factory=lambda: {}
    )


@dataclass
class LlamaChroma(Retriever):
    config: LlamaChromaConfig = None
    client: chromadb.ClientAPI = None
    index: VectorStoreIndex = None
    # llm: OpenAI = None
    llm_config: dict[str, Any] = None

    def __post_init__(self):
        if self.config is None:
            self.config = LlamaChromaConfig()
        if self.client is None:
            if "CHROMA_SERVER_AUTH_CREDENTIALS" in os.environ:
                s = Settings(
                    chroma_client_auth_provider="chromadb.auth.token.TokenAuthClientProvider",
                    chroma_client_auth_credentials=os.environ.get("CHROMA_SERVER_AUTH_CREDENTIALS"),
                    anonymized_telemetry=False,
                )
            else:
                s = Settings(anonymized_telemetry=False)

            if self.config.host:
                log.debug(
                    f"LlamaChroma::  Creating http client at {self.config.host}:{self.config.port}"
                )
                self.client = chromadb.HttpClient(
                    host=self.config.host, 
                    port=self.config.port,
                    settings=s
                    )
            else:
                log.debug("LlamaChroma::  Creating ephemeral client")
                self.client = chromadb.EphemeralClient()

    # @staticmethod
    # def make_collection_name(company: str, time_path: str) -> str:
    #     company = os.path.basename(company)
    #     timestr = os.path.basename(time_path)
    #     return f"{company}.{SUBDIR}.{timestr}.{EMBED_MODEL.short_name()}"

    @staticmethod
    def _get_last_collection(chroma_client: ClientAPI, name: str) -> chromadb.Collection:
        collections = chroma_client.list_collections()
        print("All collections", collections)
        col_list = [c for c in collections if c.name.startswith(name)]
        col_list = sorted(col_list, key=lambda x: x.name, reverse=True)
        print(f"Filtered collections = {col_list}")
        if len(col_list) == 0:
            raise ValueError(f"No collections found with name {name}")
        return col_list[0]

    def get_last_collection(self, name: str) -> chromadb.Collection:
        return LlamaChroma._get_last_collection(self.client, name)

    def get_collection(self, collection_name) -> chromadb.Collection:
        chroma_collection = self.client.get_collection(collection_name)
        return chroma_collection

    def get_or_create_collection(
        self,
        collection_name,
        document_location: str,
        model_name: EmbeddingName = None,
        recursive: bool = True,
    ) -> chromadb.Collection:
        documents = SimpleDirectoryReader(
            input_dir=document_location, recursive=recursive
        ).load_data()

        chroma_collection = self.client.get_or_create_collection(collection_name)

        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        embed_model_params = self.config.embed_model_params.copy()
        if model_name:
            embed_model_params["model_name"] = model_name
        embed_model = get_embedding(**embed_model_params)

        self.index = VectorStoreIndex.from_documents(
            documents, storage_context=storage_context, embed_model=embed_model
        )

        return chroma_collection

    def create_or_update_collection(
        self,
        collection_name,
        document_location: str,
        use_timestr: bool = False,
        model_name: EmbeddingName = None,
        recursive: bool = True,
    ) -> chromadb.Collection:
        """
        Create or update a collection with the given name and document location.
        This will remove the previous collection if it exists.
        """
        if use_timestr:
            collection_name = f"{collection_name}_{time.strftime('%Y%m%d-%H%M%S')}"
        try:
            collection = self.client.get_collection(collection_name)
            ## temp name
            temp_name = f"{collection_name}_{uuid.uuid4().hex[:8]}"[:64]
            temp_collection = self.get_or_create_collection(
                temp_name, document_location, recursive=recursive, model_name=model_name
            )
            print("temp_collection", temp_collection.count(), temp_collection.name)
            ## delete old and rename
            collection.delete()
            temp_collection.modify(name=collection_name)
            print("Modified", temp_collection.count(), temp_collection.name)
            collection = self.client.get_collection(collection_name)
            print("collection", collection.count(), collection.name)
        except:
            collection = self.get_or_create_collection(
                collection_name, document_location, recursive=recursive, model_name=model_name
            )
        return collection

    def search(self, query: str) -> str:
        cfg = self.llm_config.copy()
        model = self.llm_config.pop("name")
        llm = CustomOpenAI(model=model, **cfg)
        engine = self.index.as_query_engine(
            similarity_top_k=5,
            temperature=0.0,
            llm=llm,
        )
        query_engine_tools = [
            QueryEngineTool(
                query_engine=engine,
                metadata=ToolMetadata(
                    name="document_search",
                    description=("Documents about Paul Graham and his essays. "),
                ),
            ),
        ]
        agent = OpenAIAgent.from_tools(query_engine_tools, llm=llm, verbose=True)
        response = agent.query(query)
        return response

    # def search(self, query: str) -> str:
    # cfg = self.llm_config.copy()
    # model = self.llm_config.pop("name")
    # llm = CustomOpenAI(model=model, **cfg)
    # chat_engine = self.index.as_chat_engine(chat_mode="openai", llm=llm, verbose=True)
    # # query_engine = self.index.as_query_engine(similarity_top_k=5, temperature=0.0)
    # # response = query_engine.query(query)
    # return chat_engine.chat(query, tool_choice="query_engine_tool")
