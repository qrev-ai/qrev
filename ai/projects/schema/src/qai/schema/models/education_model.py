from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from flexible_datetime import flextime
from pydantic import Field

from qai.schema.models.addons import (
    CreatedAtDoc,
    DateRange,
    Deleteable,
    Labels,
    Provenance,
    Taggable,
)
from qai.schema.models.address_model import Address
from qai.schema.models.email_model import Email


class Education(CreatedAtDoc, Deleteable, Taggable, Labels, DateRange):
    degree: Optional[str] = Field(default=None, description="The degree obtained")
    field_of_study: Optional[str] = Field(default=None, description="The field of study")
    institution: Optional[str] = Field(
        default=None, description="The institution where the degree was obtained"
    )
    institution_id: Optional[PydanticObjectId] = Field(
        default=None, description="The reference to the institution"
    )
    location: Optional[Address] = Field(default=None, description="The location of the institution")
    description: Optional[str] = Field(
        default=None, description="A description of the education experience"
    )
    notes: Optional[str] = Field(
        default=None, description="Additional notes regarding the education"
    )
    current: bool = Field(default=False, description="Whether this education experience is ongoing")
    email: Optional[Email] = Field(
        default=None, description="Contact email related to the education"
    )
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the education record"
    )

    class Settings:
        equality_fields = ["degree", "institution_id"]
        keep_nulls = False


def normalize_flextime(ft: flextime) -> flextime:
    # Convert to a common precision (e.g., day precision)
    return flextime(ft.to_datetime())


def _sort_education_key(obj: Education) -> tuple[flextime, flextime]:
    # Sort education history by start_date and then end_date
    start_value = (
        normalize_flextime(obj.start)
        if obj.start is not None
        else normalize_flextime(flextime(datetime.min))
    )
    end_value = (
        normalize_flextime(obj.end)
        if obj.end is not None
        else normalize_flextime(flextime(datetime.max))
    )
    return (start_value, end_value)
