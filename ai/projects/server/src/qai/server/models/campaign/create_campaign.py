"""
Data Model for create campaign request and response
"""

from typing import Dict, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, field_validator
from pydantic_core import Url


# Utility function to strip trailing slashes
def strip_trailing_slash(url: str) -> str:
    return url.rstrip("/")


class Message(BaseModel):
    role: str
    content: str


class Conversation(BaseModel):
    conversation_id: str
    messages: List[Message]


class SenderCompany(BaseModel):
    name: str
    website_url: str  # Changed from AnyHttpUrl to str
    industry: Optional[str] = None

    @field_validator("website_url", mode="before")
    @classmethod
    def validate_asynchronous(cls, v):
        if isinstance(v, str):
            stripped_url = strip_trailing_slash(v)
            # Validate the stripped URL using Url
            try:
                Url(stripped_url)
            except ValueError as e:
                raise ValueError(f"Invalid URL: {stripped_url}") from e
            return stripped_url
        return v


class SenderPerson(BaseModel):
    name: str
    email: str
    title: str


class TimeOfDispatch(BaseModel):
    time_value: int
    time_unit: Literal["day"]


class UploadedData(BaseModel):
    email: str
    name: str
    timezone: str


class ResourceDocument(BaseModel):
    name: str
    s3_links: List[str]


class SequenceStep(BaseModel):
    type: str
    time_of_dispatch: TimeOfDispatch


class DefaultConfigurations(BaseModel):
    exclude_domains: List[str]
    sequence_steps_template: List[SequenceStep]


class CreateCampaignRequestModel(BaseModel):
    query: str
    company_id: str
    user_id: str
    conversation: Optional[Conversation]
    sender_company: SenderCompany
    sender_person: SenderPerson
    token: str
    asynchronous: str  # Changed from AnyHttpUrl to str
    uploaded_data: List[UploadedData]
    sender_resource_documents: List[ResourceDocument]
    default_configurations: DefaultConfigurations

    @field_validator("asynchronous", mode="before")
    @classmethod
    def validate_asynchronous(cls, v):
        if isinstance(v, str):
            stripped_url = strip_trailing_slash(v)
            # Validate the stripped URL using Url
            try:
                Url(stripped_url)
            except ValueError as e:
                raise ValueError(f"Invalid URL: {stripped_url}") from e
            return stripped_url
        return v

    def to_params(self) -> Dict:
        return {
            "name": f"Campaign for {self.sender_company.name}",
            "description": f"Campaign created based on query: {self.query}",
        }


class Person(BaseModel):
    name: str
    email: str
    phone_number: str


class ListAction(BaseModel):
    type: Literal["list"]
    title: str
    values: List[Person]


class Step(BaseModel):
    id: UUID
    type: Literal["ai_generated_email"]
    time_of_dispatch: TimeOfDispatch


class Sequence(BaseModel):
    id: UUID
    name: str
    steps: List[Step]


class EmailSequenceDraftAction(BaseModel):
    type: Literal["email_sequence_draft"]
    title: str
    subject: str
    body: str
    sequence: Sequence


Action = Union[ListAction, EmailSequenceDraftAction]


class CreateCampaignResponseModel(BaseModel):
    actions: List[Action]
