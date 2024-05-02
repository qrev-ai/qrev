import collections
import copy

from qai.chat.prompt.prompt_maker import DEFAULT, PromptMaker
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import openai
import requests
from dotenv import load_dotenv
from openai import OpenAI
from openai.types.chat import ChatCompletion
from tenacity import retry, stop_after_attempt, wait_random_exponential
from termcolor import colored

from flask import current_app as app
# from qai.chat import cfg
from qai.chat.layers.layer import Layer
from qai.chat.layers.query import Query, QueryReturn
from qai.chat.prompt.config import PromptConfig

# from openai.openai_object import OpenAIObject




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


@retry(wait=wait_random_exponential(multiplier=1, max=40), stop=stop_after_attempt(3))
def chat_completion_request(messages, tools=None, tool_choice=None, model=None):
    model = model or app.cfg.model.name
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + openai.api_key,
    }
    json_data = {"model": model, "messages": messages}
    if tools is not None:
        json_data.update({"tools": tools})
    if tool_choice is not None:
        json_data.update({"tool_choice": tool_choice})
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=json_data,
        )
        return response
    except Exception as e:
        print("Unable to generate ChatCompletion response")
        print(f"Exception: {e}")
        return e


@dataclass(kw_only=True)
class LLM:
    config: dict[str, Any]

    def __post_init__(self):
        if self.config is None:
            self.config = {}
        if not "temperature" in self.config:
            self.config["temperature"] = 0.0

    @property
    def model(self):
        return self.config.get("name")

    def simple_query(
        self,
        query: str = None,
        messages: list[dict] = None,
        model: str = None,
        tools: list[dict] = None,
        tool_choice: str | dict = None,
        system_message=None,
        **kwargs,
    ) -> QueryReturn:
        if query is None and messages is None:
            raise ValueError("query or messages must be provided")
        if messages is None:
            messages = []
        if system_message:
            messages.insert(0, {"role": "system", "content": system_message})
        if query:
            messages.append({"role": "user", "content": query})
        if tool_choice and isinstance(tool_choice, str):
            tool_choice = {"type": "function", "function": {"name": tool_choice}}
        if not model:
            model = self.model if not "name" in kwargs else kwargs.get("name")
        temperature = self.config.get("temperature", 0.0)
        print(model, temperature, messages, tools, tool_choice)
        # completion = openai.ChatCompletion.create(
        #     model=model, temperature=temperature, messages=messages, **kwargs
        # )

        client = OpenAI()
        completion = client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=messages,
            tools=tools,
            tool_choice=tool_choice,
            **kwargs,
        )
        r = completion.choices[0].message
        from pprint import pprint
        pprint(completion)
        
        messages.append(dict(r))
        qr = QueryReturn(
            data=completion,
            model=model,
            query=query,
            messages=messages,
            temperature=temperature,
        )

        return qr

    def _query(self, messages: list[dict[str, str]], query: Query) -> QueryReturn:
        kwargs = query.kwargs
        model = query.model
        if not model:
            model = self.model if not "name" in kwargs else kwargs.get("name")
        logging.debug(
            f"{query.guid}:LLM._query: model={model}, messages={messages}, kwargs={kwargs}"
        )
        qp = kwargs.get("query_params", {})
        temperature = qp.get("temperature", self.config["temperature"])
        client = OpenAI()
        completion = client.chat.completions.create(
            model=model, temperature=temperature, messages=messages, **kwargs
        )

        # completion = openai.ChatCompletion.create(
        #     model=model, temperature=temperature, messages=messages, **kwargs
        # )
        logging.debug(
            f"{query.guid}:LLM._query returns: response=<<<{completion.choices[0].message.content}>>>"
        )

        qr = QueryReturn(
            data=completion,
            model=model,
            query=query,
            messages=messages,
            temperature=temperature,
        )
        qr.found_answer = qr.response != qr.not_found_token
        return qr

    def query(self, query: Query, messages: list[dict[str, str]] = None, **kwargs) -> QueryReturn:
        if messages is None:
            messages = []
        if len(messages) > 0:
            if messages[-1]["content"] != query.query:
                messages.append({"role": "user", "content": query.query})
        else:
            messages.append({"role": "user", "content": query.query})
        messages = [{"role": m["role"], "content": m["content"]} for m in messages]
        return self._query(messages=messages, query=query, **kwargs)


class Chatbot(Layer):
    def __init__(
        self,
        config: dict[str, Any] = None,
        llm: LLM = None,
        llm_params: dict[str, Any] = None,
        prompt_maker: "PromptMaker" = None,
        prompt_config: PromptConfig = None,
        **kwargs
    ) -> None:
        self.name = "LLMChatbot"
        if config is None:
            config = {}
        model_params = llm_params if llm_params is not None else config.get("model", {})
        if prompt_config is None:
            prompt_config = PromptConfig(**config.get("prompt", {}))
        if not isinstance(prompt_config, PromptConfig):
            raise ValueError(f"prompt_config must be PromptConfig, got {type(prompt_config)}")
        self.config = copy.deepcopy(config)
        self.llm = llm
        if not self.llm:
            self.llm = LLM(config=model_params)
        self.prompt_maker = prompt_maker
        if not self.prompt_maker:
            from qai.chat.prompt.prompt_maker import PromptMaker
            raise ValueError(f"prompt_maker must be PromptMaker, got {type(prompt_maker)}")
            # self.prompt_maker = PromptMaker(
            #     prompt_config,)

    def get(self, key: str, value: Any, default: Any = None) -> Any:
        return self.config.get(key, default) if value is None else value

    @property
    def system_message(self):
        return self.prompt_maker.system_message

    def _query(
        self,
        query: Query,
    ) -> QueryReturn:
        logging.debug(f"{query.guid}:Chatbot::query={query}, query_params={query.params}")
        msgs = self.prompt_maker.make_prompt_messages(
            query=query,
            retrieval_config=self.config.get("vectorstore", {}),
        )

        response: QueryReturn = self.llm.query(query, messages=msgs)
        if True:
            # if remove_after_question_mark: ## TODO
            content = response.data.choices[0].message.content
            response.data.choices[0].message.content = content.split("?")[0]
        response.query = query
        return response
