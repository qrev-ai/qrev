from dataclasses import dataclass
from datetime import datetime

import openai
import requests
from openai import OpenAI
from openai.types.chat import ChatCompletion
from qai.ai import Query, QueryReturn
from qai.ai.config import cfg
from qai.ai.llm import LLM
from tenacity import retry, stop_after_attempt, wait_random_exponential

date = datetime.now().strftime("%m%d%Y_%H:%M:%S")

sentinel = object()


@retry(wait=wait_random_exponential(multiplier=1, max=40), stop=stop_after_attempt(3))
def chat_completion_request(messages, tools=None, tool_choice=None, model=None):
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + openai.api_key,
    }
    if model is None:
        model = cfg.model.name
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
class OpenAILLM(LLM):
    client: OpenAI = None

    def __post_init__(self):
        if self.config is None:
            self.config = {}
        if not "temperature" in self.config:
            self.config["temperature"] = 0.0
        if not "name" in self.config:
            raise ValueError("A default model name must be provided")

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
        repeat: int = None,
        validate: bool = False,
        required_fields: list[str] = None,
        **kwargs,
    ) -> QueryReturn:
        if query is None and messages is None:
            raise ValueError("query or messages must be provided")
        if messages is None:
            messages = []
        if system_message:
            messages.insert(0, {"role": "system", "content": system_message})
        if query:
            messages.insert(0, {"role": "user", "content": query})
        if not query or isinstance(query, str):
            query = Query(
                query=query,
                messages=messages,
                model=model,
                temperature=temperature,
                tools=tools,
                tool_choice=tool_choice,
                **kwargs,
            )
        if not query.tool_choice and tool_choice and isinstance(tool_choice, str):
            query.tool_choice = {"type": "function", "function": {"name": tool_choice}}
        if not query.model:
            query.model = self.model if not "name" in kwargs else kwargs.get("name")
        if not query.model:
            model = self.model
        if not query.temperature:
            query.temperature = self.config.get("temperature", 0.0)
        # print(model, temperature, messages, tools, tool_choice)
        if self.client is None:
            self.client = OpenAI()
        nrepeats = repeat or 1
        for i in range(nrepeats):
            try:
                completion = self.client.chat.completions.create(
                    model=query.model,
                    temperature=query.temperature,
                    messages=query.messages,
                    tools=query.tools,
                    tool_choice=query.tool_choice,
                    **kwargs,
                )
            except Exception as e:
                print(model, temperature, messages, tools, tool_choice)
                print(f"Attempt {i+1}/{nrepeats} failed. Exception: {e}")
                print(f"Query: {query}")
                if i >= nrepeats - 1:
                    raise e
                continue
            r: ChatCompletion = completion.choices[0].message
            # print("Attempt ", i+1, query.messages[-1])
            # pprint(completion)

            qr = QueryReturn(
                data=completion,
                model=model,
                query=query,
                messages=messages,
                temperature=temperature,
            )
            try:
                if validate:
                    qr.validate(required_fields=required_fields)
                break
            except Exception as e:
                if i >= nrepeats - 1:
                    raise e
                print(f"Attempt {i+1}/{nrepeats} failed. Validation error: {e}")
                continue
        # if qr.response:
        #     messages.append(dict(r))

        return qr
