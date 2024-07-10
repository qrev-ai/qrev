import itertools
import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, ClassVar, Self, Optional

import pandas as pd
from openai.types.chat import ChatCompletion
from pi_conf.config import AttrDict

from qai.ai.prompt.config import PromptConfig

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

    query: Optional[str] = None
    messages: Optional[list[dict]] = None
    params: Optional[dict[str, Any]] = None
    company_name: Optional[str] = None
    model: Optional[str] = None
    tools: Optional[list[str]] = None
    tool_choice: Optional[str | dict] = None
    sources: list[str] = field(default_factory=list)
    history: Optional[list[dict[str, str]]] = None
    temperature: Optional[float] = None
    kwargs: dict[str, Any] = field(default_factory=dict)
    prompt_config: PromptConfig = field(default_factory=PromptConfig)
    guid: Optional[str] = None
    _instance_id: Optional[int] = None
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
        if not self.messages:
            self.messages = []
        if len(self.messages) > 0:
            if self.query and self.query != self.messages[-1]["content"]:
                self.messages.append({"role": "user", "content": self.query})

    def get_required_fields(self, fn_dict: dict[str, str]):
        """
        Get the required fields for a query that had tools.
        Only works if the query had tools and there was only one tool.
        """
        try:
            return self.tools[0]["function"]["parameters"]["required"]
        except:
            return False


@dataclass
class QueryReturn:
    query: Optional[Query] = None
    data: Optional[ChatCompletion] = None
    model: Optional[str] = None
    messages: list[dict[str, Any]] = field(default_factory=list)
    found_answer: bool = False
    not_found_token: str = "-1"
    is_impossible: bool = False
    category: str = ""
    company_name: str = ""
    temperature: Optional[float] = None

    def arguments(self) -> dict[str, Any] | None:
        try:
            d = json.loads(self.data.choices[0].message.tool_calls[0].function.arguments)
        except Exception as e:
            return None
        return d

    def to_message(self) -> dict[str, str]:
        return {
            "role": "assistant",
            "content": self.response,
        }

    def validate(self, required_fields=None) -> bool:
        """Validate the response against the required fields."""
        if self.query.tools:            
            required = required_fields or self.query.get_required_fields(self.query.tools)
            if not self._match_arguments(required):
                raise ValueError(
                    f"QueryReturn::validate: Required fields not found in response."
                    f"response={self.response}, required={required}, found={self.arguments()}"
                )

        return True

    def _match_arguments(self, required: list[str]) -> bool:
        args = self.arguments()
        if not args and required:
            print(f"match_arguments:: {args} != {required}")
            return False
        ## Flatten the keys (nasty looking but as clean and fast as I could get it)
        d = pd.json_normalize(args, sep="#").to_dict(orient="records")
        print("######", d)
        args = list(itertools.chain(*[col.split("#") for col in d[0].keys()]))
        print(f"args: {args}")
        req = set(required)
        print(f"req: {req}")
        print("is subset: ", req.issubset(args))
        return req.issubset(args)

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
        return self.response if self.response else self.__expr__()

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
