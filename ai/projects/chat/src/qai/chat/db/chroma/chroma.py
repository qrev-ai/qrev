import logging
import os
from dataclasses import dataclass, field
from typing import Any

from chromadb import Collection, HttpClient
from chromadb.api import AdminAPI, ClientAPI, QueryResult
from chromadb.api.models.Collection import Collection as ChromaCollection
from chromadb.config import Settings
from pi_conf import Config

from qai.chat.db import Retriever
from qai.chat.prompt.config import CONTEXT_TOKEN_LIMIT

log = logging.getLogger(__name__)


@dataclass
class ChromaConfig(Config):
    type: str = "http"
    host: str = "localhost"
    port: int = 8000
    path: str = ""


@dataclass
class Chroma(Retriever):
    config: ChromaConfig = field(default_factory=dict)

    def __post_init__(self):
        if "CHROMA_SERVER_AUTH_CREDENTIALS" in os.environ:
            s = Settings(
                chroma_client_auth_provider="chromadb.auth.token.TokenAuthClientProvider",
                chroma_client_auth_credentials=os.environ.get("CHROMA_SERVER_AUTH_CREDENTIALS"),
                anonymized_telemetry=False,
                allow_reset=True,
            )
        else:
            s = Settings(
                anonymized_telemetry=False,
                allow_reset=True,
            )

        print(self.config)
        self.chroma_client = HttpClient(
            host=self.config["host"],
            port=self.config["port"],
            settings=s,
        )

    @staticmethod
    def _get_last_collection(chroma_client: ClientAPI, name: str) -> Collection:
        collections = chroma_client.list_collections()
        print("All collections", collections)
        col_list = [c for c in collections if c.name.startswith(name)]
        col_list = sorted(col_list, key=lambda x: x.name, reverse=True)
        print(f"Filtered collections = {col_list}")
        if len(col_list) == 0:
            raise ValueError(f"No collections found with name {name}")
        return col_list[0]

    def get_last_collection(self, name: str) -> Collection:
        return Chroma._get_last_collection(self.chroma_client, name)

    def get_collection(self, collection_name) -> ChromaCollection:
        try:
            col = self.chroma_client.get_collection(collection_name)
            log.debug(f"found {collection_name} collection. count={col.count()}")
        except Exception as e:
            log.error(f"collection {collection_name} not found")
            raise
        return col

    def get_or_create_collection(self, collection_name) -> ChromaCollection:
        return self.chroma_client.get_or_create_collection(collection_name)

    def delete_collection(self, collection_name):
        self.chroma_client.delete_collection(collection_name)

    def get_context(
        self,
        query: str,
        company_name: str,
        retrieval_config: dict[str, str],
        context_token_limit: int = CONTEXT_TOKEN_LIMIT,
        k: int = 8,
    ) -> list[tuple[str, dict[str, Any]]]:
        # c = Retriever(config=retrieval_config)
        col = self.get_collection(company_name)
        result: QueryResult = col.query(query_texts=[query], n_results=k)
        log.debug(f"PromptMaker::get_context: col_count={col.count()}, result={result}")
        # ids = result["ids"][0]
        # srcs = result["metadatas"][0]
        # srcs = [os.path.basename(s["source"]) for s in srcs]
        # docs = result["documents"][0]
        # distances = result["distances"][0]
        # total_tokens = 0
        # seen = set()
        # ## These come sorted by distance, so we can just iterate until we hit the limit
        # for i in range(len(ids)):
        #     token_estimate = num_tokens(docs[i])
        #     if total_tokens + token_estimate > context_token_limit:
        #         break
        #     content = docs[i]
        #     if content in seen:
        #         continue
        #     seen.add(content)
        #     d = {
        #         "role": "user",
        #         "content": content,
        #         "source": srcs[i],
        #         "distance": distances[i],
        #         "token_estimate": token_estimate,
        #     }
        #     context.append(d)
        # if self.config.get("strategy.triple_quote_context", True):
        #     for d in context:
        #         d["content"] = f'"""{d["content"]}"""'
