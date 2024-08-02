from typing import TYPE_CHECKING, Optional, TypeAlias, TypeVar

from beanie import Document
from beanie import Link as BeanieLink
from beanie import PydanticObjectId
from beanie.odm.queries.find import FindOne as BeanieFindOne
from pydantic import BaseModel, EmailStr, Field, field_validator
from qai.schema.models.addons import (
    CreatedAtDoc,
    DateRange,
    Deleteable,
    Labels,
    Taggable,
)
from qai.schema.models.company_model import Company
from qai.schema.models.contact_model import Contact
from qai.schema.models.models import OutreachType
from qai.schema.models.qbeanie import Link


class EnrichmentSources(BaseModel):
    pdl: bool = False
    nubela: bool = False
    linkedin: bool = False


class CampaignOptions(BaseModel):
    skip_existing_customers: bool = Field(default=True, title="Skip existing customers")


class Campaign(CreatedAtDoc, Deleteable, DateRange, Taggable, Labels):
    name: str = Field(..., description="The name of the campaign")
    description: Optional[str] = Field(default=None, description="The description of the campaign")

    contacts: list[Link[Contact]] = Field(
        default=None, description="The references to the people of the campaign"
    )
    companies: list[Link[Company]] = Field(
        default=None, description="The references to the companies of the campaign"
    )
    campaign_steps: list[Link["CampaignStep"]] = Field(default_factory=list)

    exclude_domains: list[str] = Field(default_factory=list, title="List of domains to filter out")
    exclude_emails: list[EmailStr] = Field(
        default_factory=list, title="List of emails to filter out"
    )
    exclude_titles: list[str] = Field(default_factory=list, title="List of titles to filter out")
    include_emails: list[str] = Field(default_factory=list, title="List of emails to include")
    include_titles: list[str] = Field(default_factory=list, title="List of titles to include")

    ## TODO information about Ideal Customer Profile (ICP)

    class Settings:
        name = "campaigns"
        equality_fields = ["name"]
        keep_nulls = False

    @field_validator("exclude_domains", mode="before")
    def strip_protocols(cls, v):
        if isinstance(v, list):
            v = [domain.lstrip("http://").lstrip("https://").lstrip("www.") for domain in v]
        return v


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
