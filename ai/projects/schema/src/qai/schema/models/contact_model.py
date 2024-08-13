from typing import TYPE_CHECKING, Any, Optional

from beanie import PydanticObjectId
from pydantic import Field

from qai.schema.models.addons import (
    CreatedAtDoc,
    DateRange,
    Deleteable,
    Labels,
    Taggable,
)
from qai.schema.models.address_model import Address
from qai.schema.models.company_model import Company
from qai.schema.models.email_model import Email
from qai.schema.models.models import ExcludeReason
from qai.schema.models.name_model import Name
from qai.schema.models.person_model import Person
from qai.schema.models.phone_number_model import PhoneNumber
from qai.schema.models.qbeanie import Link
from qai.schema.models.social_media_model import SocialMedia

if TYPE_CHECKING:
    from qai.schema.models.campaign_model import Campaign


class Contact(CreatedAtDoc, Taggable, Labels, Deleteable):
    """A snapshot in time of a person for outreach purposes."""

    person: Link[Person] = Field(..., description="The reference to the person")
    person_id: PydanticObjectId = Field(..., description="The ID of the person")
    name: Name = Field(..., description="The name of the contact")
    location: Optional[Address] = Field(default=None, description="The location of the contact")
    campaign_id: PydanticObjectId = Field(..., description="The ID of the campaign")
    company: Optional[Link[Company]] = Field(
        default=None, description="The reference to the company"
    )
    email: Optional[Email] = Field(default=None, description="The email of the contact")
    email_verifications: Optional[dict[str, dict[str, Any]]] = Field(
        default=None, description="The email verifications of the contact"
    )
    phone: Optional[PhoneNumber] = Field(
        default=None, description="The phone number of the contact"
    )
    social_media: Optional[list[SocialMedia]] = Field(
        default=None, description="The social media urls of the person"
    )
    notes: Optional[str] = Field(default=None, description="The notes of the contact")
    excluded: Optional[bool] = Field(default=None, description="Whether the contact is excluded")
    excluded_reasons: Optional[list[ExcludeReason | str]] = Field(
        default=None, description="The reason for the exclusion"
    )
    temp_pdl: Optional[dict[str, Any]] = Field(
        default=None, description="The temporary PDL data of the person"
    )
    temp_nubela: Optional[dict[str, Any]] = Field(
        default=None, description="The temporary Nubela data of the person"
    )

    temp_linkedin: Optional[dict[str, Any]] = Field(
        default=None, description="The temporary LinkedIn data of the person"
    )

    temp_linkedin_activity: Optional[dict[str, Any]] = Field(
        default=None, description="The temporary LinkedIn data of the person"
    )

    class Settings:
        name = "contacts"
        equality_fields = ["person_id", "campaign_id"]
        keep_nulls = False

    @staticmethod
    def from_data(person: Person, company: Company, campaign: "Campaign") -> "Contact":
        if not person.id:
            raise ValueError(f"Person ID is required. Person: {person}")
        if not campaign.id:
            raise ValueError(f"Campaign ID is required. Campaign: {campaign}")
        c = Contact(
            person=person,
            person_id=person.id,
            name=person.name if person.name else Name(),
            campaign_id=campaign.id,
            company=company,
            email=person.emails[0] if person.emails else None,
            phone=person.phone_numbers[0] if person.phone_numbers else None,
            social_media=person.social_media,
            location=person.addresses[0] if person.addresses else None,
        )
        return c

    @classmethod
    async def get_or_create(
        cls: type["Contact"], person: Person, company: Company, campaign: "Campaign"
    ) -> "Contact":
        contact = cls.from_data(person=person, company=company, campaign=campaign)
        return await Contact.find_or_insert(contact)

    @property
    def safe_company_name(self) -> str:
        return self.company.name if self.company else ""

class ContactList(CreatedAtDoc, Deleteable, DateRange, Taggable, Labels):
    name: str = Field(..., description="The name of the contact list")
    description: Optional[str] = Field(
        default=None, description="The description of the contact list"
    )

    contacts: list[Link[Contact]] = Field(
        default=None, description="The references to the people of the contact list"
    )

    class Settings:
        name = "contact_lists"
        equality_fields = ["name"]
        keep_nulls = False
