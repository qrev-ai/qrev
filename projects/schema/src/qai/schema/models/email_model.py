from enum import StrEnum
from typing import Optional

from pydantic import EmailStr, Field

from qai.schema.extensions import ExtendedDocument

from qai.schema.models.addons import CreatedAtDoc, ExpiredAtDoc, Provenance


class EmailType(StrEnum):
    OTHER = "other"
    PERSONAL = "personal"
    WORK = "work"


class Email(ExtendedDocument, ExpiredAtDoc):
    address: EmailStr = Field(..., description="The email address")
    type: Optional[EmailType] = Field(default=None, description="The email type")
    current: Optional[bool] = Field(
        default=None, description="Whether the email is the current one"
    )
    pdl_code: Optional[str] = Field(default=None, description="The pdl code")
    provenance: Optional[Provenance] = Field(default=None, description="The provenance")

    class Settings:
        equality_fields = ["address"]

    @property
    def domain(self) -> str:
        return self.address.split("@")[1]

    @property
    def name(self) -> str:
        return self.address.split("@")[0]


class UnlinkedEmail(CreatedAtDoc):
    """Used for emails that are not linked to a person."""

    address: EmailStr = Field(..., description="The email address")
    email_type: EmailType = Field(default=EmailType.OTHER, description="The email type")
    provenance: Optional[Provenance] = Field(default=None, description="The provenance")

    class Settings:
        collection_name = "unlinked_emails"
        equality_fields = ["address"]
