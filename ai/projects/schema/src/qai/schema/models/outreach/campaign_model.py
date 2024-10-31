import json
import os
import tomllib as toml
from enum import Enum
from pathlib import Path
from typing import TYPE_CHECKING, Optional, TypeAlias, TypeVar

from beanie import Document
from beanie import Link as BeanieLink
from beanie import PydanticObjectId
from beanie.odm.queries.find import FindOne as BeanieFindOne
from pi_conf import ConfigDict, ConfigSettings
from pi_conf.config_settings import ConfigDict, ConfigSettings
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from qai.schema.models.addons import (
    CreatedAtDoc,
    DateRange,
    Deleteable,
    Labels,
    Taggable,
)
from qai.schema.models.company_model import Company
from qai.schema.models.contact_model import Contact
from qai.schema.models.data_source import DataSource
from qai.schema.models.models import OutreachType
from qai.schema.models.mongo_model import MongoConfig
from qai.schema.models.outreach.email import Outreach
from qai.schema.models.qbeanie import Link

sentinel = object()


class EnrichmentSource(BaseModel):
    type: str
    include: bool



class IncExcOptions(BaseModel):
    domains: Optional[list[str]] = Field(default=None)
    emails: Optional[list[str]] = Field(default=None)
    titles: Optional[list[str]] = Field(default=None)
    emails_file: Optional[str] = Field(default=None)
    domains_file: Optional[str] = Field(default=None)
    titles_file: Optional[str] = Field(default=None)

    def _load_from_file(self, file_path: Optional[str]) -> list[str]:
        if file_path:
            with open(os.path.expanduser(file_path)) as f:
                return json.load(f)
        return []

    def get_list(self, attr: str, file_attr: str) -> list[str]:
        return getattr(self, attr) or self._load_from_file(getattr(self, file_attr)) or []

    def get_domains(self) -> list[str]:
        return self.get_list("domains", "domains_file")

    def get_emails(self) -> list[str]:
        return self.get_list("emails", "emails_file")

    def get_titles(self) -> list[str]:
        return self.get_list("titles", "titles_file")

    @field_validator("domains", mode="before")
    def strip_protocols(cls, v):
        if isinstance(v, list):
            v = [domain.lstrip("http://").lstrip("https://").lstrip("www.") for domain in v]
        return v

class ExcludeOptions(IncExcOptions):
    pass

class IncludeOptions(IncExcOptions):
    pass

class ClientOptions(ConfigSettings):
    mongo: MongoConfig

    def load_campaign_options(self):
        pass


class Campaign(CreatedAtDoc, Deleteable, DateRange, Taggable, Labels):
    name: str = Field(..., description="The name of the campaign")

    description: Optional[str] = Field(default=None, description="The description of the campaign")

    contacts: Optional[list[Link[Contact]]] = Field(
        default=None, description="The references to the people of the campaign"
    )
    companies: Optional[list[Link[Company]]] = Field(
        default=None, description="The references to the companies of the campaign"
    )
    outreach: Optional[Outreach] = Field(
        default=None, description="The outreach options of the campaign"
    )

    exclude: Optional[ExcludeOptions] = Field(
        default=None, description="The exclude options of the campaign"
    )
    include: Optional[IncludeOptions] = Field(
        default=None, description="The include options of the campaign"
    )

    enrichments: Optional[list[EnrichmentSource]] = Field(
        default=None, description="Which enrichments were used in the campaign. Linkedin, Web, etc"
    )

    sources: Optional[list[DataSource]] = Field(
        default=None, description="The sources of the campaign"
    )

    brand_docs: Optional[list[DataSource]] = Field(
        default=None, description="Brand documents to use for this campaign."
    )

    customer_pain_points: Optional[list[DataSource]] = Field(
        default=None, description="Customer pain points to use for this campaign."
    )

    case_studies: Optional[list[DataSource]] = Field(
        default=None, description="Case studies to use for this campaign."
    )
    additional_docs: Optional[list[DataSource]] = Field(
        default=None, description="Other documents to use for this campaign."
    )

    icps: Optional[list[DataSource]] = Field(
        default=None, description="Ideal customer profiles to use for this campaign."
    )

    class Settings:
        name = "campaigns"
        equality_fields = ["name"]
        keep_nulls = False

    @property
    def brand(self) -> Optional[str]:
        s = ""
        if not self.brand_docs:
            return s
        for doc in self.brand_docs:
            if doc.type == "file":
                with open(doc.path) as f:
                    s += f.read()
        return s
    
    @property
    def pain_points(self) -> Optional[str]:
        s = ""
        if not self.customer_pain_points:
            return s
        for doc in self.customer_pain_points:
            if doc.type == "file":
                with open(doc.path) as f:
                    s += f.read()
        return s


class CampaignStep(CreatedAtDoc, Deleteable, DateRange, Taggable, Labels):
    campaign_id: PydanticObjectId = Field(..., description="The ID of the campaign")
    name: str = Field(..., description="The name of the step")
    step: int = Field(..., description="The order of the step")
    description: Optional[str] = Field(default=None, description="The description of the step")
    outreach_type: Optional[OutreachType] = Field(default=None, description="The type of outreach")
    contacts: list[Link[Contact]] = Field(
        default=None, description="The references to the people of the step"
    )
    # companies: list[Link[Company]] = Field(
    #     default=None, description="The references to the companies of the step"
    # )
    batches: list[Link["CampaignBatch"]] = Field(
        default_factory=list, description="The references to the batches of the step"
    )
    notes: Optional[str] = Field(default=None, description="The notes of the batch")

    class Settings:
        name = "campaign_steps"
        equality_fields = ["campaign_id", "name"]
        keep_nulls = False


class CampaignBatch(CreatedAtDoc, Deleteable, DateRange, Taggable, Labels):
    campaign_id: PydanticObjectId = Field(..., description="The ID of the campaign")
    campaign_step_id: PydanticObjectId = Field(..., description="The ID of the campaign step")
    order: int = Field(..., description="The order of the batch")
    name: str = Field(..., description="The name of the batch")
    contacts: list[Link[Contact]] = Field(
        default=None, description="The references to the people of the batch"
    )
    notes: Optional[str] = Field(default=None, description="The notes of the batch")

    class Settings:
        name = "campaign_batches"
        equality_fields = ["campaign_id", "campaign_step_id", "order", "name"]
        keep_nulls = False
