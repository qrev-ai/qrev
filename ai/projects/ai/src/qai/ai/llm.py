from dataclasses import dataclass
from datetime import datetime
from typing import Any

from termcolor import colored

from qai.ai import Query, QueryReturn

date = datetime.now().strftime("%m%d%Y_%H:%M:%S")

sentinel = object()


def pretty_print_conversation(messages):
    role_to_color = {
        "system": "red",
        "user": "green",
        "assistant": "blue",
        "tool": "magenta",
    }

    for message in messages:
        if message["role"] == "system":
            print(colored(f"system: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "user":
            print(colored(f"user: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "assistant" and message.get("function_call"):
            print(
                colored(f"assistant: {message['function_call']}\n", role_to_color[message["role"]])
            )
        elif message["role"] == "assistant" and not message.get("function_call"):
            print(colored(f"assistant: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "tool":
            print(
                colored(
                    f"function ({message['name']}): {message['content']}\n",
                    role_to_color[message["role"]],
                )
            )


@dataclass(kw_only=True)
class LLM:
    config: dict[str, Any] = None

    @property
    def model(self):
        return self.config.get("name")

    def query(
        self,
        query: str | Query = None,
        messages: list[dict] = None,
        model: str = None,
        tools: list[dict] = None,
        tool_choice: str | dict = None,
        temperature: float = None,
        system_message=None,
        **kwargs,
    ) -> QueryReturn: ...
