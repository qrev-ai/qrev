from typing import Any, Sequence

from llama_index.core.base.llms.types import ChatMessage, ChatResponse
from llama_index.llms.openai import OpenAI
from llama_index.llms.openai.utils import from_openai_message, to_openai_message_dicts


class CustomOpenAI(OpenAI):
    def _chat(self, messages: Sequence[ChatMessage], **kwargs: Any) -> ChatResponse:
        client = self._get_client()
        message_dicts = to_openai_message_dicts(messages)
        # from pprint import pprint
        # print("22222 @@@@@@@@@@@")
        # pprint(kwargs)
        # print("################")
        # pprint(messages)
        # print("################")
        response = client.chat.completions.create(
            messages=message_dicts,
            stream=False,
            **self._get_model_kwargs(**kwargs),
        )
        openai_message = response.choices[0].message
        message = from_openai_message(openai_message)

        return ChatResponse(
            message=message,
            raw=response,
            additional_kwargs=self._get_response_token_counts(response),
        )
