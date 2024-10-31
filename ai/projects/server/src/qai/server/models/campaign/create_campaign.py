"""
Data Model for create campaign request and response
"""

from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Tuple, Type, Union
from uuid import UUID

from pydantic import BaseModel, field_validator
from pydantic_core import Url
from qai import schema as q
from qai.schema.models.data_source import SourceType


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
    uploaded_data: List[Any]
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

    def _create_data_source(self, data: dict[Any, Any]) -> dict:
        """Helper method to create appropriate DataSource based on the uploaded data"""
        if hasattr(data, "file_path"):
            return {"type": SourceType.FILE, "path": data.file_path, "encoding": "utf-8"}
        elif hasattr(data, "content"):
            return {"type": SourceType.TEXT, "content": data.content}
        elif hasattr(data, "url"):
            return {"type": SourceType.URL, "url": data.url}
        elif hasattr(data, "folder_path"):
            return {"type": SourceType.FOLDER, "path": data.folder_path, "recursive": False}
        else:
            raise ValueError(
                f"Uploaded data must have either file_path, content, url, or folder_path: {data}"
            )

    def _create_resource_source(self, d: dict) -> q.DataSource:
        """Helper method to create a DataFile source for resource documents"""
        # return {"type": SourceType.FILE, "path": path, "encoding": "utf-8"}
        return q.DataSource.model_validate()

    def to_company_params(self) -> Dict:
        return {
            "name": self.sender_company.name,
            "domains": [self.sender_company.website_url],
            "industries": [self.sender_company.industry],
            "qid": self.company_id,
        }

    # def to_params(self) -> Dict:
    #     params = {
    #         "name": f"Campaign for {self.sender_company.name}",
    #         "description": f"Campaign created based on query: {self.query}",
    #         "created_at": datetime.utcnow(),
    #         "contacts": [],
    #         "companies": [],
    #         # "sources": [self._create_data_source(data) for data in self.uploaded_data],
    #         "enrichments": [
    #             {"type": "linkedin", "include": True},
    #             {"type": "web", "include": True},
    #         ],
    #         # "brand_docs": [],
    #         # "case_studies": [],
    #         # "customer_pain_points": [],
    #         # "icps": [],
    #         "exclude": {
    #             "domains": (
    #                 self.default_configurations.excluded_domains
    #                 if hasattr(self.default_configurations, "excluded_domains")
    #                 else None
    #             ),
    #             "emails": (
    #                 self.default_configurations.excluded_emails
    #                 if hasattr(self.default_configurations, "excluded_emails")
    #                 else None
    #             ),
    #             "titles": (
    #                 self.default_configurations.excluded_titles
    #                 if hasattr(self.default_configurations, "excluded_titles")
    #                 else None
    #             ),
    #         },
    #         "outreach": (
    #             self.default_configurations.outreach.dict()
    #             if hasattr(self.default_configurations, "outreach")
    #             else None
    #         ),
    #         "tags": [],
    #         "labels": {},
    #         "qid": self.company_id,
    #     }

    #     # Process resource documents
    #     for doc in self.sender_resource_documents:
    #         if doc.name == "brand_doc":
    #             for link in doc.s3_links:
    #                 ds = q.DataSource(type="FILE", path=link, encoding="utf-8")
    #                 params["brand_docs"].append(ds)
    #         elif doc.name == "case_study":
    #             for link in doc.s3_links:
    #                 params["case_studies"].append(self._create_resource_source(link))
    #         elif doc.name == "pain_point":
    #             for link in doc.s3_links:
    #                 params["customer_pain_points"].append(self._create_resource_source(link))
    #         elif doc.name == "icp":
    #             for link in doc.s3_links:
    #                 params["icps"].append(self._create_resource_source(link))

    #     # Remove None values to match keep_nulls=False in Campaign Settings
    #     return {k: v for k, v in params.items() if v is not None}

    def to_qmodel(self) -> Tuple[q.Company, q.Campaign]:
        """
        Convert the request model to Company and Campaign models.

        Returns:
            Tuple[Company, Campaign]: A tuple containing the Company and Campaign models
        """
        # Create Company model
        company = q.Company(
            name=self.sender_company.name,
            domains=[self.sender_company.website_url],
            industries=[self.sender_company.industry] if self.sender_company.industry else None,
            qid=self.company_id,
            created_at=datetime.utcnow(),
        )

        # Create Campaign model
        campaign = q.Campaign(
            name=f"Campaign for {self.sender_company.name}",
            description=f"Campaign created based on query: {self.query}",
            created_at=datetime.utcnow(),
            contacts=[],  # Will be populated later with actual contacts
            companies=[],  # Will be populated later with actual companies
            enrichments=[
                {"type": "linkedin", "include": True},
                {"type": "web", "include": True},
            ],
            exclude=q.ExcludeOptions(
                domains=(
                    self.default_configurations.exclude_domains
                    if hasattr(self.default_configurations, "exclude_domains")
                    else None
                ),
                emails=None,  # Can be added if needed
                titles=None,  # Can be added if needed
            ),
        )

        # Process resource documents
        resource_mappings = {
            "brand_doc": "brand_docs",
            "case_study": "case_studies",
            "pain_point": "customer_pain_points",
            "icp": "icps",
        }

        for doc in self.sender_resource_documents:
            if doc.name in resource_mappings:
                datasources = []
                for link in doc.s3_links:
                    d = {"type":"FILE", "path":link, "encoding":"utf-8"}
                    ds = q.DataSource.model_validate(d)
                    datasources.append(ds)
                setattr(campaign, resource_mappings[doc.name], datasources)

        # Add outreach configuration if available in default_configurations
        ## TODO fix if outreach is present in campaign request
        # if hasattr(self.default_configurations, "sequence_steps_template"):
        #     
        #     campaign.outreach = q.Outreach(
        #         steps=[
        #             {
        #                 "order": i,
        #                 "type": step.type,
        #                 "time_of_dispatch": {
        #                     "time_value": step.time_of_dispatch.time_value,
        #                     "time_unit": step.time_of_dispatch.time_unit,
        #                 },
        #             }
        #             for i, step in enumerate(self.default_configurations.sequence_steps_template)
        #         ]
        #     )

        return company, campaign


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
