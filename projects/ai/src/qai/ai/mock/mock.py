import logging
from dataclasses import dataclass, field
from pprint import pformat

from openai.types.chat import ChatCompletion
from openai.types.chat.chat_completion import Choice
from openai.types.chat.chat_completion_message import ChatCompletionMessage

log = logging.getLogger(__name__)


class Completions:
    def create(self, *, messages, model, **kwargs) -> ChatCompletion:
        log.debug(
            (
                f"MockLLM._query: model={model}, "
                f"num_messages={len(messages)}, messages={pformat(messages)}"
            )
        )
        parms = kwargs.get("params", {})
        content = parms.get("response", "Mocked Response")
        choice = Choice(
            finish_reason="stop",
            index=0,
            message=ChatCompletionMessage(
                content=content,
                role="assistant",
            ),
            logprobs=None,
        )

        c = ChatCompletion(
            id="mocked_id",
            choices=[choice],
            model=model,
            created=0,
            object="chat.completion",
            system_fingerprint=None,
            usage=None,
        )
        return c


@dataclass
class MockChat:
    completions: Completions = field(default_factory=Completions)


@dataclass
class MockLLMClient:
    chat: MockChat = field(default_factory=MockChat)
