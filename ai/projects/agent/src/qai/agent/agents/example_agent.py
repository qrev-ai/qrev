from enum import StrEnum
from typing import Any, Self, Sequence

from llama_index.agent.openai import OpenAIAgent
from llama_index.core.bridge.pydantic import BaseModel, Field
from llama_index.core.llms.llm import LLM
from llama_index.core.tools import BaseTool, FunctionTool

# from .tools.types import ToolMetadata
from llama_index.core.tools.types import ToolMetadata
from pydantic import BaseModel, Field


class AgentType(StrEnum):
    campaign = "campaign"
    database = "database"
    conversation = "conversation"
    website_navigator = "website_navigator"
    # new_workflow = "new_workflow"
    # activate_existing_workflow = "activate_existing_workflow"

    def __eq__(self, other: str | Self) -> bool:
        try:
            return super().__eq__(other)
        except:
            if str(self.value) == str(other):
                return True
            raise


class FindAgentModel(BaseModel):
    sentence: str = Field(description="The user sentence to find the correct agent for.")
    agent_type: AgentType = Field(description="Which agent the user action belongs to.")


def find_agent(sentence: str, agent_type: AgentType) -> tuple[str, AgentType]:
    print(f"Found agent for sentence: {sentence} agent_type: {agent_type}")

    return sentence, agent_type


class FindAgentWorker(OpenAIAgent):
    """An Agent to find the best agent given a user sentence."""

    name: str = "find_agent"
    description: str = (
        f"Find the correct agent given a user sentence. "
        f"Only use one of the following agent types: [{','.join([str(e) for e in AgentType])}]"
    )

    @classmethod
    def create(cls, nametools: Sequence[BaseTool] = None, llm: LLM = None, *args, **kwargs: Any):
        print("#######")
        print(str(cls.name))
        print("#######")
        find_agent_tool = FunctionTool.from_defaults(
            name=cls.name,
            fn=find_agent,
            # description=description,
            # fn_schema=FindAgentModel,
            tool_metadata=ToolMetadata(
                name=cls.name,
                description=cls.description,
                fn_schema=FindAgentModel,
            ),
        )
        agent = FindAgentWorker.from_tools(llm=llm, tools=[find_agent_tool], verbose=True)

        return agent


def test_find_agent():
    from pi_conf import load_config

    cfg = load_config("qai-chat")
    cfg.to_env()
    agent = FindAgentWorker.create()

    sentence = "I want to create a campaign"
    # llm = OpenAI(model="gpt-3.5-turbo-0125")
    # from llama_index.core.tools import BaseTool, FunctionTool

    # name = "find_agent"
    # description = (
    #     f"Find the correct agent given a user sentence. "
    #     f"Only use one of the following agent types: [{','.join([str(e) for e in AgentType])}]"
    # )
    # find_agent_tool = FunctionTool.from_defaults(
    #     name=name,
    #     fn=find_agent,
    #     # description=description,
    #     # fn_schema=FindAgentModel,
    #     tool_metadata=ToolMetadata(
    #         name=name,
    #         description=description,
    #         fn_schema=FindAgentModel,
    #     ),
    # )
    # agent = OpenAIAgent.from_tools(llm=llm, tools=[find_agent_tool], verbose=True)
    # # print(agent.chat(sentence, tool_choice="find_agent"))
    print(agent.chat(sentence))
    print("FINISHED")


if __name__ == "__main__":
    test_find_agent()
