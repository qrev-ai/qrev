from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from flexible_datetime import flextime
from pydantic import BaseModel, Field

from qai.schema.extensions import ExtendedDocument
from qai.schema.mergers.merge import (
    HIGH_PRIORITY,
    HIGHER_PRIORITY,
    LOW_PRIORITY,
    LOWER_PRIORITY,
    NORMAL_PRIORITY,
)

priorities = {
    "manual": NORMAL_PRIORITY,
    "ai_generated": LOW_PRIORITY,
    "linkedin": HIGHER_PRIORITY,
    "slintel": HIGH_PRIORITY,
    "pdl": HIGH_PRIORITY,
    "nubela": HIGH_PRIORITY,
}


def get_priority(source: str):
    return priorities.get(source.lower(), NORMAL_PRIORITY)


class Taggable(BaseModel):
    tags: Optional[list[str]] = Field(default=None, description="The tags for the document")


class Labels(BaseModel):
    tags: Optional[list[str]] = Field(default=None, description="The tags for the document")


class ExpiredAtDoc(BaseModel):
    expired_at: Optional[flextime] = Field(
        default=None, description="The timestamp of the document expiration"
    )


class Provenance(BaseModel):
    source: str = Field(default=None, description="The source of the document")
    source_id: Optional[PydanticObjectId] = Field(
        default=None, description="The source id of the document"
    )
    str_id: Optional[str] = Field(
        default=None, description="The source id of the document if not inserted into the database"
    )
    sources: Optional[list[str]] = Field(
        default=None, description="The sources of the document"
    )

    @property
    def priority(self):
        return get_priority(self.source)


class Deleteable(BaseModel):
    deleted_at: Optional[datetime] = Field(
        default=None, description="The timestamp of the document deletion"
    )
    is_deleted: bool = Field(default=False, description="Whether the document is deleted")


class DateRange(BaseModel):
    start: Optional[flextime] = Field(default=None, description="The start date of the range")
    end: Optional[flextime] = Field(default=None, description="The end date of the range")


class Updateable(BaseModel):
    updated_at: Optional[flextime] = Field(
        default=None, description="The timestamp of the document update"
    )
    last_checked_at: Optional[flextime] = Field(
        default=None, description="The timestamp of the last check"
    )


class CreatedAtDoc(ExtendedDocument):
    created_at: flextime = Field(
        default_factory=flextime, description="The timestamp of the document creation"
    )
