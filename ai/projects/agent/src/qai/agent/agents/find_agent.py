from typing import Any, Callable, Dict, List, Optional, Sequence, Type

from llama_index.agent.openai import OpenAIAgent
from llama_index.agent.openai.base import DEFAULT_MAX_FUNCTION_CALLS
from llama_index.core.base.llms.types import ChatMessage
from llama_index.core.bridge.pydantic import BaseModel, Field
from llama_index.core.callbacks import CallbackManager
from llama_index.core.llms.llm import LLM
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.memory.chat_memory_buffer import ChatMemoryBuffer
from llama_index.core.memory.types import BaseMemory
from llama_index.core.objects.base import ObjectRetriever
from llama_index.core.tools import BaseTool, FunctionTool
from llama_index.core.tools.types import ToolMetadata
from llama_index.llms.openai.utils import OpenAIToolCall

from qai.agent.tools.types import StringEnum


class AgentType(StringEnum):
    campaign = "campaign"
    database = "database"
    conversation = "conversation"
    website_navigator = "website_navigator"
    # new_workflow = "new_workflow"
    # activate_existing_workflow = "activate_existing_workflow"


class FindAgentModel(BaseModel):
    sentence: str = Field(description="The user sentence to find the correct agent for.")
    agent_type: AgentType = Field(description="Which agent the user action belongs to.")


def find_agent(sentence: str, agent_type: AgentType) -> AgentType:
    print(f"Found agent for sentence: {sentence} agent_type: {agent_type}")

    # return {"sentence": sentence, "agent_type": agent_type}
    return agent_type


class FindAgentWorker(OpenAIAgent):
    """An Agent to find the best agent given a user sentence."""

    name: str = "find_agent"
    description: str = (
        f"Find the correct agent given a user sentence. "
        f"Only use one of the following agent types: [{','.join([str(e) for e in AgentType])}]"
    )

    @classmethod
    def create(
        cls,
        nametools: Sequence[BaseTool] = None,
        tools: Optional[List[BaseTool]] = None,
        tool_retriever: Optional[ObjectRetriever[BaseTool]] = None,
        llm: Optional[LLM] = None,
        chat_history: Optional[List[ChatMessage]] = None,
        memory: Optional[BaseMemory] = None,
        memory_cls: Type[BaseMemory] = ChatMemoryBuffer,
        verbose: bool = True,
        max_function_calls: int = DEFAULT_MAX_FUNCTION_CALLS,
        default_tool_choice: str = "auto",
        callback_manager: Optional[CallbackManager] = None,
        system_prompt: Optional[str] = None,
        prefix_messages: Optional[List[ChatMessage]] = None,
        tool_call_parser: Optional[Callable[[OpenAIToolCall], Dict]] = None,
        *args,
        **kwargs: Any,
    ):
        find_agent_tool = FunctionTool.from_defaults(
            name=cls.name,
            fn=find_agent,
            tool_metadata=ToolMetadata(
                name=cls.name,
                description=cls.description,
                fn_schema=FindAgentModel,
            ),
        )
        agent = FindAgentWorker.from_tools(
            llm=llm,
            tools=[find_agent_tool],
            max_function_calls=max_function_calls,
            default_tool_choice=default_tool_choice,
            callback_manager=callback_manager,
            prefix_messages=prefix_messages,
            tool_call_parser=tool_call_parser,
            chat_history=chat_history,
            memory=memory,
            memory_cls=memory_cls,
            verbose=verbose,
        )

        return agent
