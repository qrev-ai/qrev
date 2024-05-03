from typing import Any, Dict, Optional

from llama_index.core.base.llms.types import ChatResponse
from llama_index.core.bridge.pydantic import BaseModel
from llama_index.core.program import LLMTextCompletionProgram


class StructuredResponse:
    model : BaseModel
    response : ChatResponse

class StructuredLLM(LLMTextCompletionProgram):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def __call__(
        self,
        llm_kwargs: Optional[Dict[str, Any]] = None,
        *args: Any,
        **kwargs: Any,
    ) -> BaseModel:
        llm_kwargs = llm_kwargs or {}
        if self._llm.metadata.is_chat_model:
            messages = self._prompt.format_messages(llm=self._llm, **kwargs)

            response = self._llm.chat(messages, **llm_kwargs)

            raw_output = response.message.content or ""
        else:
            formatted_prompt = self._prompt.format(llm=self._llm, **kwargs)

            response = self._llm.complete(formatted_prompt, **llm_kwargs)

            raw_output = response.text

        output = self._output_parser.parse(raw_output)
        if not isinstance(output, self._output_cls):
            raise ValueError(
                f"Output parser returned {type(output)} but expected {self._output_cls}"
            )
        return output