import uuid
from dataclasses import dataclass
from logging import getLogger
from typing import Any, Dict, List, Optional, Self, Union

from llama_index.agent.openai import OpenAIAgent
from llama_index.core.agent import AgentChatResponse, Task
from llama_index.core.agent.types import Task
from llama_index.core.base.llms.types import ChatMessage
from llama_index.core.bridge.pydantic import BaseModel, Field
from llama_index.core.chat_engine.types import AgentChatResponse
from llama_index.core.llms import ChatMessage
from llama_index.core.tools import BaseTool
from llama_index.core.tools.tool_spec.base import BaseToolSpec
from llama_index.core.tools.types import BaseTool
from qai.schema import OutreachType

from qai.agent import cfg
from qai.agent.agents.email_agent import EmailAgent, EmailModel
from qai.agent.agents.sqlquery_agent import RefineSQLQuery, StepModel

log = getLogger(__name__)


class PersonID(BaseModel):
    id: str = Field(description="The database id of the person.")


class PersonModel(BaseModel):
    id: Optional[str] = Field(description="The database id of the person.")
    name: Optional[str] = Field(description="The name of the person.")
    email: Optional[str] = Field(description="The email of the person.")
    phone: Optional[str] = Field(description="The phone number of the person.")
    linkedin: Optional[str] = Field(description="The linkedin profile of the person.")
    whatsapp: Optional[str] = Field(description="The whatsapp number of the person.")


class CompanyCampaignModel(BaseModel):
    people: list[str] = Field(description="A list of people to generate a campaign for.")
    companies: list[str] = Field(description="A list of companies to generate a campaign for.")
    outreach_types: list[OutreachType] = Field(
        description="The type of outreach to use for the campaign."
    )


class CampaignToolSpec(BaseToolSpec):
    agent: "CampaignAgent" = None
    companies: list[str] = Field(description="A list of companies to generate a campaign for.")
    spec_functions = ["create_campaign", "text_to_outreach_type"]

    def __init__(self, *args, **kwargs):
        pass

    def text_to_outreach_type(self, outreach_types: list[OutreachType]) -> list[OutreachType]:
        """
        Convert a natural langague of strings to a list of OutreachType objects.
        Args:
            outreach_types: A list of strings representing the outreach types.
        Returns:
            A list of OutreachType objects.
        """
        log.debug(f"Converting outreach types: {outreach_types}")
        return outreach_types

    def create_campaign(
        self,
        people: list[PersonID],
        outreach_types: list[OutreachType],
    ) -> str:
        """
        Create a campaign for a list of PersonID objects. These id's should never be inferred.
        If they are missing, ask for them.
        Args:
            people: A list of PersonID objects to generate a campaign for.
            outreach_types: A list of OutreachType objects for how to contact the people.
        Returns:
            A string indicating the campaign was created.
        """
        # people = self.people
        log.debug(
            f"Creating campaign for # people: {len(people)}  # outreach_types: {len(outreach_types)}, people={people}"
        )
        for p in people:
            log.debug(f"Person: {p} Outreach: {outreach_types}")

        return "Campaign is starting to be created, it can be found in the campaign tab."


@dataclass
class CampaignResponse(AgentChatResponse):
    completed: bool = False
    emails: List[EmailModel] = None
    sequence_id: str = None


class CampaignOptions(BaseModel):
    allow_enrichment: bool = Field(
        description="Allow enrichment of the people and companies data.", default=False
    )
    allow_expansion: bool = Field(
        description="Allow expansion of the people and companies data.", default=False
    )


class CampaignAgent(OpenAIAgent):
    """
    An agent that generates a campaign for a list of people and companies.
    """

    def __init__(
        self, tools: List[BaseTool], options: CampaignOptions = None, **kwargs: Any
    ) -> None:
        """Init params."""
        super().__init__(
            tools=tools,
            **kwargs,
        )
        # The person to send the emails from.
        self.from_person: dict = {}
        # The company to send the emails from.
        self.from_company: dict = {}
        # A dict of people to generate a campaign for.
        self.people: dict = {}
        # A dict of companies to generate a campaign for.
        self.companies: dict = {}
        # The type of outreach to use for the campaign.
        self.outreach_types: list[OutreachType] = [OutreachType.EMAIL]
        # The URL to call when the emails are completed.
        self.on_complete_emails_url: Optional[str] = None

        self.email_agent: EmailAgent = None

        self.options: CampaignOptions = options or CampaignOptions()

    @staticmethod
    def _email_on_complete(url: str = None) -> None:
        log.debug(f"Call sent to {url}")

    def _initialize_state(self, task: Task, **kwargs: Any) -> Dict[str, Any]:
        """Initialize state."""
        log.debug(f"Initializing state for task {task} with kwargs {kwargs}")
        return {"count": 0, "current_reasoning": []}

    def chat(
        self,
        message: str,
        chat_history: Optional[List[ChatMessage]] = None,
        tool_choice: Optional[Union[str, dict]] = None,
    ) -> CampaignResponse:
        """
        Chat with the agent.
        """
        log.debug(f"Chatting with message {message} and tool_choice {tool_choice}")
        log.debug(
            f"  People IDs: {len(self.people)}, company IDs: {len(self.companies)}, "
            f"outreach types: {len(self.outreach_types)}"
        )

        refine_tools = RefineSQLQuery(**cfg.db)

        refining_agent = OpenAIAgent.from_tools(
            refine_tools.to_tool_list(),
            verbose=True,
            system_prompt=refine_tools.refine_query_system_message,
        )
        r: AgentChatResponse = refining_agent.chat(message, tool_choice="find_steps")
        if r.sources and r.sources[0].tool_name == "find_steps":
            tool = r.sources[0]
            steps: list[StepModel] = tool.raw_output
            log.debug(f"Tool output: ")
            for step in steps:
                if not self.options.allow_expansion:
                    log.debug(f"  Skipping expansion of data for step: {step}")
                    continue
                log.debug(f"  Step: {step}")
                try:
                    if step.category == "people":
                        result = refine_tools.load_people(step.sentence)
                        ## result is a list of dict, change to dict
                        if result:
                            result = {r["id"]: r for r in result}
                        self.people.update(result)
                        log.debug(f"  Added People: {len(result)}")
                    elif step.category == "company":
                        result = refine_tools.load_companies(step.sentence)
                        ## result is a list of dict, change to dict
                        if result:
                            result = {r["id"]: r for r in result}
                        self.companies.update(result)
                        log.debug(f"  Added Companies: {len(result)}")

                    else:
                        result = "No Result"
                except Exception as e:
                    log.error(f"Error: {e}\nStep={step}\nResult: {result}")
                    raise
                log.debug(f"  Result: {result}")
        npeople = len(self.people) > 0
        ncompanies = len(self.companies) > 0
        noutreach = len(self.outreach_types) > 0
        assistant_message = ". I have the following:"
        if npeople:
            assistant_message += f"\n  People: {list(self.people.keys())[0]}"
        if ncompanies:
            assistant_message += f"\n  Companies: {list(self.companies.keys())[0]}"
        if noutreach:
            assistant_message += (
                f"\n  Outreach types: {' '.join([str(o) for o in self.outreach_types])}"
            )
        ## I am missing the following
        if not npeople or not noutreach:
            assistant_message += "\n. I am missing the following information :"
            if not npeople:
                assistant_message += "\n    People"
            ## Purposefully not using companies as we don't really need them
            if not noutreach:
                assistant_message += "\n    Outreach types"
        message += assistant_message
        response: AgentChatResponse = super().chat(message, chat_history, tool_choice)
        completed = response.sources and response.sources[0].tool_name == "create_campaign"
        emails = None
        sequence_id = str(uuid.uuid4())
        setattr(response, "completed", completed)
        setattr(response, "sequence_id", sequence_id)

        if completed:
            emails = self.email_agent.create_emails(
                sequence_id, self.from_person, self.from_company, self.people, self.companies
            )
        setattr(response, "emails", emails)
        log.debug(
            f"campaignagent::Chat completed={completed}  response: {response} emails: {emails}"
        )
        return response

    def _finalize_task(self, task: Task, **kwargs: Any) -> None:
        """Finalize task."""
        log.debug(f"Finalizing task with state {task} and kwargs {kwargs}")
        # nothing to finalize here

    @staticmethod
    def create(
        people: list[dict] = None,
        companies: list[dict] = None,
        outreach_types: list[OutreachType] = None,
        on_complete_emails_url: str = None,
        tools: List[BaseTool] = None,
        verbose: bool = False,
        from_company: dict = None,
        from_person: dict = None,
        model_config: dict = None,
        system_prompt: str = None,
        email_agent: EmailAgent = None,
        options: CampaignOptions = None,
        **kwargs,
    ) -> "CampaignAgent":
        campaign_tool = CampaignToolSpec()
        tools = tools or campaign_tool.to_tool_list()
        system_prompt = system_prompt or (
            "Create a campaign for a list of people and companies. If a parameter is missing,"
            " please ask for it, do not try to infer it."
        )
        agent: CampaignAgent = CampaignAgent.from_tools(
            tools=tools,
            system_prompt=system_prompt,
            verbose=verbose,
            **kwargs,
        )
        agent.people = people or {}
        agent.companies = companies or {}
        agent.on_complete_emails_url = on_complete_emails_url
        agent.from_person = from_person or {}
        agent.from_company = from_company or {}
        agent.email_agent = email_agent or EmailAgent.create(
            agent.from_person,
            agent.from_company,
        )
        agent.options = options or CampaignOptions()
        return agent
