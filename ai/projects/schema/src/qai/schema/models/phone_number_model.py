from enum import StrEnum
from typing import Optional

from pydantic import Field

from qai.schema.models.addons import CreatedAtDoc, Provenance


class PhoneType(StrEnum):
    OTHER = "other"
    MOBILE = "mobile"
    HOME = "home"
    WORK = "work"
    TOLL_FREE = "toll_free"
    FAX = "fax"


class PhoneNumber(CreatedAtDoc):
    number: str = Field(..., description="The phone number")
    type: PhoneType = Field(default=PhoneType.OTHER, description="The phone type")
    notes: Optional[str] = Field(default=None, description="The phone number notes")
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the PhoneNumber"
    )

    class Settings:
        equality_fields = ["number"]
