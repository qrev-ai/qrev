from typing import TYPE_CHECKING, Optional

from beanie import PydanticObjectId
from pydantic import Field

from qai.schema.models.addons import CreatedAtDoc, DateRange, Deleteable, Labels, Provenance, Taggable
from qai.schema.models.address_model import Address
from qai.schema.models.email_model import Email


class Job(CreatedAtDoc, Deleteable, Taggable, Labels, DateRange):
    title: Optional[str] = Field(default=None, description="The title of the job")
    division: Optional[str] = Field(default=None, description="The division of the job")
    company: Optional[str] = Field(default=None, description="The company of the job")
    company_id: Optional[PydanticObjectId] = Field(
        default=None, description="The reference to the company"
    )
    location: Optional[Address] = Field(default=None, description="The location of the job")
    description: Optional[str] = Field(default=None, description="The description of the job")
    notes: Optional[str] = Field(default=None, description="The notes of the job")
    current: bool = Field(default=False, description="Whether the job is the current one")
    email: Optional[Email] = Field(default=None, description="The email of the job")
    provenance: Optional[Provenance] = Field(default=None, description="The provenance")

    class Settings:
        equality_fields = ["title", "company_id"]
        keep_nulls = False


def _sort_job_key(obj: Job):
    ## sort work_history by start_date and then end_date
    end_value = obj.end if obj.end is not None else float("inf")
    return (obj.start, end_value)
