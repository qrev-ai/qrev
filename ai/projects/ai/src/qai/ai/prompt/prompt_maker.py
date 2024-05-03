import collections
import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from qai.ai import Query
from qai.ai.utils.token_utils import num_tokens

from .config import (
    CONTEXT_TOKEN_LIMIT,
    HISTORY_LIMIT,
    HISTORY_TOKEN_LIMIT,
    PromptConfig,
    default_system_message,
)

if TYPE_CHECKING:
    from qai.ai.search.retriever import Retriever
    from llama_index import LLamaIndex

log = logging.getLogger(__name__)
DEFAULT = object()

categories = [
    "About",
    "Contact",
    "Marketing",
    "Pricing",
    "Sales",
    "Solutions",
    "Industries",
    "Data",
    "Ecosystem",
    "Resources",
    "Customers",
    "Company",
    "General",
    "Support",
    "Privacy Policy",
    "Terms of Service",
    "Cookie Policy",
]


@dataclass
class PromptMaker:
    """
    Reference:
    https://platform.openai.com/docs/guides/gpt-best-practices/strategy-provide-reference-text
    """

    config: PromptConfig = field(default_factory=PromptConfig)
    retrieval_config: dict[str, Any] = field(default_factory=dict)
    index_name: str = None
    company_name: str = None
    #    retrieval_config: dict[str, str] = field(default_factory=dict)
    # index: LLamaIndex = None

    def __post_init__(self):
        from qai.chat.db.chroma.chroma import Chroma
        # from qai.chat.db.llama_index.llama_creator import LLamaIndex

        if self.index_name is None:
            raise ValueError("index_name must be set")
        if self.company_name is None:
            raise ValueError("company_name must be set")

        if self.retrieval_config:
            self.chroma = Chroma(config=self.retrieval_config)
            # self.index = LLamaIndex(chroma=self.chroma, index_name=self.index_name)
        if self.index is None:
            raise ValueError("index must be set")

    @property
    def system_message(self) -> str:
        try:
            return self.config.system_message
        except:
            return self.config.get("system_message", default_system_message)

    @system_message.setter
    def system_message(self, value: str):
        self.config["system_message"] = value

    def get_history_messages(
        self,
        chat_history: list[dict[str, str]],
        history_token_limit: int = HISTORY_TOKEN_LIMIT,
        history_limit: int = HISTORY_LIMIT,
    ) -> list[dict[str, str]]:
        messages = []
        hist_check = collections.defaultdict(set)
        for i, msg in enumerate(reversed(chat_history)):
            if i >= history_limit:
                break
            role = msg["role"]
            text = msg["text"] if "text" in msg else msg["content"]
            if role in hist_check and text in hist_check[role]:
                continue
            hist_check[role].add(text)

            messages.insert(0, {"role": role, "content": text})
            token_estimate = num_tokens(messages) + len(messages)
            if history_token_limit and token_estimate > history_token_limit:
                break
        return messages

    def get_context_messages(
        self,
        query: str,
        company_name: str,
        retrieval_config: dict[str, str],
        context_token_limit: int = CONTEXT_TOKEN_LIMIT,
        k: int = 8,
    ) -> list[dict[str, str]]:
        context = []
        # log.debug(
        #     f"PromptMaker::get_context_messages: query={query}, retrieval_config={retrieval_config}"
        # )
        # list_text_meta = self.index.get_context(query=query, k=k)
        # index = self.get_index(company_name=company_name)
        # c = get_retriever(config=retrieval_config)

        # c = Retriever(config=retrieval_config)

        # result: QueryResult = col.query(query_texts=[query], n_results=k)
        # log.debug(
        #     f"PromptMaker::get_context_messages: col_count={col.count()}, result={result}"
        # )
        # ids = result["ids"][0]
        # srcs = result["metadatas"][0]
        # srcs = [os.path.basename(s["source"]) for s in srcs]
        # docs = result["documents"][0]
        # distances = result["distances"][0]
        total_tokens = 0
        # if self.index is None and USE_LOCAL_INDEX:
        #     self.index = LLamaIndex.get_or_create_index(
        #         db_location=db_location,
        #         website_dir=website_dir,
        #         subfolder="simplified_md",
        #         # overwrite=True,
        #         categories=categories,
        #     )
        #     print("## finished creating index")

        ## These come sorted by distance, so we can just iterate until we hit the limit
        nodes = self.index.query(query=query, company_name=company_name, k=k)
        sources = {}
        for n in nodes:
            meta = n.node.source_node.metadata
            text = n.get_text()
            sources[text] = meta

        for text, meta in sources.items():
            token_estimate = num_tokens(text)
            log.debug(f"fpath {text} token_estimate = {token_estimate}")
            # print(f"fpath {wf} token_estimate = {token_estimate}")
            if total_tokens + token_estimate > context_token_limit:
                break
            d = {
                "role": "user",
                "content": text,
                "token_estimate": token_estimate,
            }
            context.append(d)
        if self.config.get("strategy.triple_quote_context", True):
            for d in context:
                d["content"] = f'"""{d["content"]}"""'

        log.debug(f"context len {len(context)}")

        return context

    def _get_value(
        self, potential_params: dict[str, Any], query: Query, key: str, default: Any = None
    ) -> Any:
        try:
            return getattr(self, key)
        except:
            pass
        try:
            return getattr(query, key)
        except:
            pass
        try:
            return potential_params[key]
        except:
            pass
        return default

    def make_prompt_messages(
        self,
        query: Query,
        chat_history: list[dict[str, str]] = None,
        company_name: str = None,
        retrieval_config: dict[str, str] = None,
        system_message: str = DEFAULT,
        history_token_limit: int = HISTORY_TOKEN_LIMIT,
        context_token_limit: int = CONTEXT_TOKEN_LIMIT,
        prompt_token_limit: int = 2048,
    ) -> list[dict[str, str]]:
        chat_history = self._get_value(locals(), query, "chat_history", chat_history)
        if chat_history is None:
            chat_history = query.history if query.history else []
        if company_name is None:
            company_name = query.company_name if query.company_name else ""
        k = self._get_value(locals(), query, "k", 8)
        if system_message is DEFAULT:
            system_message = (
                query.prompt_config.get("system_message")
                if "system_message" in query.prompt_config
                else ""
            )
            if not system_message:
                ### TODO Fix up, this should be from class first
                system_message = default_system_message
        all_messages = []

        if system_message:
            all_messages.append({"role": "system", "content": system_message})
        if query.use_context:
            if company_name is None:
                raise ValueError("Must provide company name for context")
            messages = self.get_context_messages(
                query=query.query,
                company_name=company_name,
                retrieval_config=retrieval_config,
                context_token_limit=context_token_limit,
                k=k,
            )
            all_messages.extend(messages)
        if chat_history:
            messages = self.get_history_messages(
                chat_history=chat_history,
                history_token_limit=history_token_limit,
            )
            all_messages.extend(messages)
        ## Add the actual query
        d = {
            "role": "user",
            "content": query.query,
        }
        all_messages.append(d)

        query.prompt_config["prompt_messages"] = all_messages
        query.prompt_config["k"] = k
        query.prompt_config["context_token_limit"] = context_token_limit
        query.prompt_config["history_token_limit"] = history_token_limit
        query.prompt_config["prompt_token_limit"] = prompt_token_limit
        return all_messages


def get_prompt_maker(config: dict[str, Any]) -> PromptMaker:
    return PromptMaker(config=config)
