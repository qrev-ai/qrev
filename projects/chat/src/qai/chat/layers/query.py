import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, ClassVar, Self

from openai.types.chat import ChatCompletion
from pi_conf.config import AttrDict

from qai.chat.prompt.config import PromptConfig

log = logging.getLogger(__name__)


@dataclass
class Query:
    """
    prompt_config:
        chat_history: list[dict[str, str]]
        company_name: str
        retrieval_config: dict[str, str]
            k: int
        system_message: str
        history_token_limit: int
        context_token_limit: int
        prompt_token_limit: int
    """

    query: str = None
    messages: list[dict] = None
    params: dict[str, Any] = None
    company_name: str = None
    model: str = None
    sources: list[str] = field(default_factory=list)
    history: list[dict[str, str]] = None
    temperature: float = None
    kwargs: dict[str, Any] = field(default_factory=dict)
    prompt_config: PromptConfig = field(default_factory=PromptConfig)
    guid: str = None
    _instance_id: int = None
    _instance_count: ClassVar[int] = 0
    use_context: bool = True

    def __str__(self):
        last_message = self.messages[-1] if self.messages else None
        return f"Query(query={self.query}, model={self.model}, guid={self.guid}, last_message={last_message})"

    def __post_init__(self):
        Query._instance_count += 1
        if not self._instance_id:
            self._instance_id = Query._instance_count
        if not self.params:
            self.params = {}
        if not self.kwargs:
            self.kwargs = {}
        if not self.guid:
            self.guid = uuid.uuid4().hex


@dataclass
class QueryReturn:
    query: Query = None
    data: ChatCompletion = None
    model: str = None
    messages: list[dict[str, Any]] = field(default_factory=list)
    found_answer: bool = False
    not_found_token: str = "-1"
    is_impossible: bool = False
    category: str = ""
    company_name: str = ""
    temperature: float = None

    def arguments(self) -> dict[str, Any]:
        # for t in self.data.choices[0].message.tool_calls:
            # print("tool_call: ", t.function.arguments)
        d = json.loads(self.data.choices[0].message.tool_calls[0].function.arguments)
        return d

    @property
    def response(self) -> str:
        return self.data.choices[0].message.content if self.data else "-1"
        # return self.data["choices"][0]["message"]["content"] if self.data else "-1"

    @response.setter
    def response(self, value):
        if not self.data:
            mock_openai_dict = {
                "choices": [{"message": {"content": value}}],
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
            }
            aiobj = AttrDict.from_dict(mock_openai_dict)
            self.data = aiobj

        self.data.choices[0].message.content = value

    @property
    def prompt_tokens(self) -> int:
        return self.data.usage.prompt_tokens if self.data else -1

    @property
    def completion_tokens(self) -> int:
        return self.data.usage.completion_tokens if self.data else -1

    @property
    def total_tokens(self) -> int:
        return self.data.usage.total_tokens if self.data else -1

    @property
    def query_params(self) -> dict[str, Any]:
        return self.query.params if self.query else {}

    @property
    def sources(self) -> list[str]:
        return self.query.sources if self.query else []

    @property
    def usage(self) -> str:
        try:
            return str(self.data.usage.total_tokens) if self.data else ""
        except Exception as e:
            log.error(f"QueryReturn.usage: {e}")
            return ""

    def __expr__(self):
        return (
            f"QueryReturn(query={self.query}, response={self.response}, "
            f"tokens=({self.prompt_tokens}, {self.completion_tokens}, {self.total_tokens})"
        )

    def __str__(self):
        return self.response

    def json(self):
        return self.data.json()

    @staticmethod
    def from_values(
        query: Query,
        response: str,
        prompt_tokens=0,
        response_tokens=0,
        company_name: str = "",
        model: str = "",
        sources: list[str] = None,
        category: str = "",
        functions: list | dict[str, Any] = None,
        params: dict[str, Any] = None,
    ) -> Self:
        mock_openai_dict = {
            "choices": [
                {
                    "message": {
                        "content": response,
                        "tool_calls": functions,
                        "role": "assistant",
                    }
                }
            ],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": response_tokens,
                "total_tokens": prompt_tokens + response_tokens,
            },
        }
        if not sources:
            sources = []
        aiobj = AttrDict.from_dict(mock_openai_dict)
        return QueryReturn(
            query=query, data=aiobj, company_name=company_name, category=category, model=model
        )
