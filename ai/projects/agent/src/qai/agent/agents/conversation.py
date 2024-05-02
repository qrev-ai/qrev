from typing import Optional, TypeVar

from llama_index.agent.openai import OpenAIAgent
from llama_index.core.agent.runner.base import AgentRunner
from llama_index.core.base.llms.types import ChatMessage, MessageRole
from llama_index.core.llms import ChatMessage
from llama_index.core.llms.llm import LLM
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.memory.chat_memory_buffer import ChatMemoryBuffer
from llama_index.core.memory.types import BaseMemory
from llama_index.core.storage.chat_store import SimpleChatStore
from llama_index.core.tools.tool_spec.base import BaseToolSpec
from llama_index.llms.openai import OpenAI
from pi_conf import load_config

from qai.ai import MessageRole
from qai.ai.frameworks.openai.llm import OpenAILLM

T = TypeVar("T", AgentRunner)


class ConversationToolSpec(BaseToolSpec):
    name: str = "conversational_chatbot"
    description: str = "A conversational chatbot agent."
    spec_functions: list[str] = ["converse"]
    memory: BaseMemory = None
    user_id: str = None

    def __init__(
        self, user_id: str, model_config: dict, memory: BaseMemory = None, *args, **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.user_id = user_id
        self.memory = memory
        self.model_config = model_config

    def converse(self, query: str) -> str:
        print(f"Conversing... user_id: {self.user_id}, query: {query}")
        self.memory.chat_store.add_message(
            key=self.user_id,
            message=ChatMessage(
                content=query,
                role=MessageRole.USER,
            ),
        )
        msgs = self.memory.chat_store.get_messages(self.user_id)
        msgs = [{"role": msg.role, "content": msg.content} for msg in msgs]
        print("Conversing...", msgs)
        llm = OpenAILLM(config=self.model_config)
        qr = llm.query(query, messages=msgs)

        self.memory.chat_store.add_message(
            key=self.user_id,
            message=ChatMessage(**qr.to_message()),
        )

    def to_agent(
        self,
        llm: Optional[LLM],
        verbose: bool = False,
        agent_cls: type[T] = OpenAIAgent,
    ) -> T:
        agent = agent_cls.from_tools(
            tools=self.to_tool_list(),
            llm=llm,
            verbose=verbose,
        )
        return agent


if __name__ == "__main__":
    cfg = load_config("qai-chat")
    cfg.to_env()
    llm = OpenAI(**cfg.model)
    chat_store = SimpleChatStore()
    user_id = "1234"
    chat_memory = ChatMemoryBuffer.from_defaults(
        token_limit=500,
        chat_store=chat_store,
        chat_store_key=user_id,
    )

    conversation_spec = ConversationToolSpec(
        user_id=user_id,
        memory=chat_memory,
        model_config=cfg.model,
    )
    agent = conversation_spec.to_agent(llm=llm, verbose=True)
    agent.chat("Hello, how are you?")
    agent.chat("Can you tell me more?")
    from pprint import pprint

    print("@@@@@@@@@@@@@@@@@")
    pprint(agent.memory.chat_store.get_messages(user_id))
    # print(conversation_tool.chat("Hello, how are you?"))
    # print(conversation_tool.create(nametools=None, tools=None))
