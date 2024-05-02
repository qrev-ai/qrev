
from llama_index.core import Settings
from llama_index.core.bridge.pydantic import BaseModel, Field
from llama_index.core.settings import Settings
from llama_index.core.tools import FunctionTool
from llama_index.core.tools.tool_spec.base import BaseToolSpec
from llama_index.core.tools.types import ToolMetadata, ToolOutput
from llama_index.llms.openai import OpenAI
from pi_conf import load_config

from qai.agent.agents.find_agent import AgentType
from qai.agent.tools.types import StringEnum

Settings.llm = OpenAI(model="gpt-3.5-turbo", temperature=0.1)


class QueryType(StringEnum):
    campaign = "campaign"
    company = "company"
    people = "people"


class QueryTypeModel(BaseModel):
    sentence: str = Field(description="The user sentence to find the correct query type for.")
    query_type: QueryType = Field(description="Which query type sentence belongs to.")


def find_query_type(sentence: str, query_type: QueryType) -> AgentType:
    """
    Find the correct query type given a user sentence.
    Only use one of the following query types: [campaign, company, people]
    Args:
        sentence: The user sentence to find the correct query type for.
        query_type: Which query type the user action belongs to.
    Returns:
        The query type.
    """
    print(f"Found find_query_type sentence: {sentence} agent_type: {query_type}")
    if isinstance(query_type, dict):
        query_type = query_type["query_type"]
    return query_type


class BasicQuery(BaseToolSpec):
    """Simple query tool that returns the query type of the user sentence."""

    step_functions: list[str] = ["find_query_type"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.find_query_tool = FunctionTool.from_defaults(
            name="find_query_type",
            fn=find_query_type,
            tool_metadata=ToolMetadata(
                name="find_query_type",
                description="Find the correct query type given a user sentence. Only use one of the following query types: [campaign, company, people]",
                fn_schema=QueryTypeModel,
            ),
        )

    @staticmethod
    def sources_to_json(sources: list) -> list[dict]:
        if not sources:
            return {}
        source: ToolOutput
        for source in sources:
            if source.raw_output:
                return source.raw_output

    def query(self, sentence: str) -> QueryType:
        """Query the user sentence to find the correct query type."""

        # basic_agent = OpenAIAgent.from_tools([self.find_query_tool])
        # r = basic_agent.chat(sentence)
        # return r.sources[0]
        sentence = sentence.lower()
        if "compan" in sentence:
            return QueryType.company
        elif "campaign" in sentence:
            return QueryType.campaign
        elif "people" in sentence:
            return QueryType.people
        else:
            return QueryType.campaign


if __name__ == "__main__":
    cfg = load_config("qai")
    basic_query = BasicQuery()
    query = "What is the best way to reach out to people?"
    r = basic_query.query(query)
    print(type(r))
