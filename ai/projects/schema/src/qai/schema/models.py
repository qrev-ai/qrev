from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING, Any, Optional, Self, TypeAlias, TypeVar, cast

from beanie import Document
from beanie import Link as BeanieLink
from beanie import PydanticObjectId
from beanie.odm.queries.find import FindOne as BeanieFindOne
from nameparser import HumanName # type: ignore
from pydantic import BaseModel, EmailStr, Field

from qai.schema.extensions import ExtendedDocument

if TYPE_CHECKING:
    _T = TypeVar("_T", bound=Document)
    Link: TypeAlias = _T
    FindOne: TypeAlias = _T
else:
    Link = BeanieLink
    FindOne = BeanieFindOne


def utcnow():
    return datetime.now(UTC)


class SexEnum(StrEnum):
    other = "other"
    male = "male"
    female = "female"
    intersex = "intersex"


class GenderEnum(StrEnum):
    other = "other"
    male = "male"
    female = "female"
    non_binary = "non-binary"
    genderqueer = "genderqueer"
    agender = "agender"
    genderfluid = "genderfluid"


class SocialMediaType(StrEnum):
    other = "other"
    linkedin = "linkedin"
    twitter = "twitter"
    facebook = "facebook"
    instagram = "instagram"
    github = "github"


class EmailType(StrEnum):
    other = "other"
    personal = "personal"
    work = "work"


class PhoneType(StrEnum):
    other = "other"
    mobile = "mobile"
    home = "home"
    work = "work"
    toll_free = "toll_free"
    fax = "fax"


class Taggable(BaseModel):
    tags: Optional[list[str]] = Field(default=None, description="The tags for the document")


class Labels(BaseModel):
    tags: Optional[list[str]] = Field(default=None, description="The tags for the document")


class ExpiredAtDoc(BaseModel):
    expired_at: datetime = Field(
        default_factory=utcnow, description="The timestamp of the document expiration"
    )


class Provenance(BaseModel):
    source: str = Field(default=None, description="The source of the document")
    source_id: Optional[PydanticObjectId] = Field(
        default=None, description="The source id of the document"
    )


class Deleteable(BaseModel):
    deleted_at: Optional[datetime] = Field(
        default=None, description="The timestamp of the document deletion"
    )
    is_deleted: bool = Field(default=False, description="Whether the document is deleted")


class DateRange(BaseModel):
    start: datetime = Field(default_factory=utcnow, description="The start date of the range")
    end: datetime = Field(default_factory=utcnow, description="The end date of the range")


class Updateable(BaseModel):
    updated_at: datetime = Field(
        default_factory=utcnow, description="The timestamp of the document update"
    )
    last_checked_at: datetime = Field(
        default_factory=utcnow, description="The timestamp of the last check"
    )


class Sourced(BaseModel):
    source: str = Field(default=None, description="The source of the document")


class TimestampDoc(ExtendedDocument):
    created_at: datetime = Field(
        default_factory=utcnow, description="The timestamp of the document creation"
    )


class Name(BaseModel):
    title: Optional[str] = Field(
        default=None, description="The title of the person, Ex: Mr, Mrs, Dr, etc."
    )
    first: Optional[str] = Field(default=None, description="The first name")
    middle: Optional[str] = Field(default=None, description="The middle name")
    last: Optional[str] = Field(default=None, description="The last name")
    suffix: Optional[str] = Field(
        default=None, description="The suffix of the person, Ex: Jr, Sr, etc."
    )
    nickname: Optional[str] = Field(default=None, description="The nickname of the person")
    surnames: Optional[list[str]] = Field(default=None, description="The surnames of the person")

    @staticmethod
    def from_str(name_str: str) -> "Name":
        if not name_str:
            raise ValueError(f"Name string '{name_str}' is empty.")

        name = HumanName(name_str)

        # Filter out empty strings from name attributes
        attributes = {
            "title": name.title,
            "first": name.first,
            "middle": name.middle,
            "last": name.last,
            "suffix": name.suffix,
            "nickname": name.nickname,
        }

        filtered_attributes = {key: value for key, value in attributes.items() if value}
        ## If everything is empty, return None
        if not filtered_attributes:
            raise ValueError(f"Name string '{name_str}' is empty.")
        surnames = [str(x) for x in name.surnames_list] if name.surnames_list else None

        return Name(
            **filtered_attributes,
            surnames=surnames,
        )


class SocialMedia(BaseModel):
    url: str = Field(..., description="The social media url")
    type: SocialMediaType = Field(
        default=SocialMediaType.other, description="The social media type"
    )
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the address"
    )

    class Settings:
        equality_fields = ["url"]


class PhoneNumber(TimestampDoc, Provenance):
    number: str = Field(..., description="The phone number")
    type: PhoneType = Field(default=PhoneType.other, description="The phone type")
    notes: Optional[str] = Field(default=None, description="The phone number notes")
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the address"
    )

    class Settings:
        equality_fields = ["number"]


class Address(ExtendedDocument, Provenance):
    street: Optional[str] = Field(default=None, description="The street address")
    street2: Optional[str] = Field(default=None, description="The street address")
    city: Optional[str] = Field(default=None, description="The city")
    state: Optional[str] = Field(default=None, description="The state")
    postal_code: Optional[str] = Field(default=None, description="The postal code")
    country: Optional[str] = Field(default=None, description="The country")
    current: bool = Field(default=False, description="Whether the address is the current one")
    notes: Optional[str] = Field(default=None, description="The address notes")

    class Settings:
        equality_fields = ["street", "street2", "city", "state", "postal_code", "country"]


class Email(ExpiredAtDoc, ExtendedDocument, Provenance):
    address: EmailStr = Field(..., description="The email address")
    email_type: EmailType = Field(default=EmailType.other, description="The email type")
    current: bool = Field(default=False, description="Whether the email is the current one")

    class Settings:
        equality_fields = ["address"]


class UnlinkedEmail(TimestampDoc):
    """Used for emails that are not linked to a person."""

    address: EmailStr = Field(..., description="The email address")
    email_type: EmailType = Field(default=EmailType.other, description="The email type")
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the address"
    )

    class Settings:
        collection_name = "unlinked_emails"
        equality_fields = ["address"]


class Job(TimestampDoc, Deleteable, Taggable, Labels, DateRange, Provenance):
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


class Person(TimestampDoc, Deleteable, Taggable, Labels):
    id: Optional[PydanticObjectId] = Field(
        default_factory=PydanticObjectId, description="The unique identifier of the person"
    )
    name: Optional[Name] = Field(default=None, description="The name of the person")
    gender: Optional[GenderEnum] = Field(
        default=None, description="The gender identity of the person"
    )
    emails: Optional[list[Email]] = Field(default=None, description="The emails of the person")
    social_media: Optional[list[SocialMedia]] = Field(
        default=None, description="The social media urls of the person"
    )

    phone_numbers: Optional[list[PhoneNumber]] = Field(
        default=None, description="The phone numbers of the person"
    )
    addresses: Optional[list[Address]] = Field(
        default=None, description="The addresses of the person"
    )

    work_history: Optional[list[Job]] = Field(
        default=None, description="The work history of the person"
    )

    class Settings:
        name = "people"
        equality_fields = ["id"]
        keep_nulls = False
        ## TODO
        # indexes = [Indexed("name.first", pymongo.collation.), Indexed("name.last")]

    def match_query(self) -> Optional[dict[str, Any]]:
        query: list[dict[str, Any]] = []

        # Match by email
        if self.emails:
            for email in self.emails:
                query.append({"emails.address": email.address})

        # Match by name and job company ID
        if self.name and self.work_history and self.name.first and self.name.last:
            for job in self.work_history:
                if job.company_id:
                    query.append(
                        {
                            "name.first": self.name.first,
                            "name.last": self.name.last,
                            "work_history.company_id": job.company_id,
                        }
                    )

        # Match by social media profiles
        if self.social_media:
            for sm in self.social_media:
                query.append({"social_media.url": sm.url, "social_media.type": sm.type})

        # Match by phone number
        if self.phone_numbers:
            for phone in self.phone_numbers:
                query.append(
                    {"phone_numbers.number": phone.number, "phone_numbers.type": phone.type}
                )

        # Match by address
        if self.addresses:
            for address in self.addresses:
                query.append(
                    {
                        "addresses.street": address.street,
                        "addresses.city": address.city,
                        "addresses.state": address.state,
                        "addresses.postal_code": address.postal_code,
                        "addresses.country": address.country,
                    }
                )

        if not query:
            return None
        return {"$or": query}


class Company(TimestampDoc, Taggable, Labels, Deleteable):
    name: str = Field(..., description="The name of the company")
    domains: list[str] = Field(default_factory=list, description="The websites of the company")
    business_name: Optional[str] = Field(
        default=None,
        description="The official business name of the company, government registered.",
    )
    parent_company: Optional[Self] = None
    people: list[Link[Person]] = Field(
        default=None, description="The references to the people of the company"
    )
    emails: Optional[list[Email]] = Field(default=None, description="The emails of the company")
    is_branch: Optional[bool] = Field(default=None, description="Whether the company is a branch")
    is_entity: Optional[bool] = Field(default=None, description="Whether the company is an entity")
    location: Optional[Address] = Field(
        default=None, description="The location of the company's headquarters"
    )

    addresses: Optional[list[Address]] = Field(
        default=None, description="The addresses of the company"
    )
    social_media: Optional[list[SocialMedia]] = Field(
        default=None, description="The social media urls of the person"
    )
    phone_numbers: Optional[list[PhoneNumber]] = Field(
        default=None, description="The phone numbers of the company"
    )
    revenues: Optional[dict[str, int]] = Field(
        default=None, description="The revenues of the company per year"
    )
    ticker: Optional[str] = Field(default=None, description="The company ticker")
    founded: Optional[int] = Field(default=None, description="The founding year of the company")

    class Settings:
        name = "companies"
        equality_fields = ["id", "domains"]
        keep_nulls = False

    def eq(self, other, nones_ok: bool = False):
        """Equality check for Company.
        Business names can be different, so we only check the name and domains.
        domains are checked first because they are more likely to be unique.
        after that, we check the name.
        """
        if not super().eq(other):
            return False
        other = cast(Company, other)
        if not self.domains and not other.domains:
            return self.name == other.name and self.domains == other.domains
        return True


class ExcludeReason(StrEnum):
    NO_EMAIL = "no_email"
    NO_PHONE = "no_phone"
    NO_SOCIAL_MEDIA = "no_social_media"
    NO_ADDRESS = "no_address"
    NO_NAME = "no_name"
    NO_COMPANY = "no_company"
    EMAIL_INVALID = "email_invalid"
    PHONE_INVALID = "phone_invalid"
    SOCIAL_MEDIA_INVALID = "social_media_invalid"
    ADDRESS_INVALID = "address_invalid"
    EMAIL_BOUNCED = "email_bounced"

    def __str__(self):
        return self.value

    def __repr__(self):
        return self.value


class Contact(TimestampDoc, Taggable, Labels, Deleteable):
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
    phone: Optional[PhoneNumber] = Field(
        default=None, description="The phone number of the contact"
    )
    social_media: Optional[list[SocialMedia]] = Field(
        default=None, description="The social media urls of the person"
    )
    notes: Optional[str] = Field(default=None, description="The notes of the contact")
    excluded: bool = Field(default=False, description="Whether the contact is excluded")
    excluded_reason: Optional[str] = Field(default=None, description="The reason for the exclusion")

    temp_pdl: Optional[dict[str, Any]] = Field(
        default=None, description="The temporary PDL data of the person"
    )
    temp_nubela: Optional[dict[str, Any]] = Field(
        default=None, description="The temporary Nubela data of the person"
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
            campaign_id=campaign.id,
            company=company,
            email=person.emails[0] if person.emails else None,
            phone=person.phone_numbers[0] if person.phone_numbers else None,
            social_media=person.social_media,
            location=person.addresses[0] if person.addresses else None,
            name=person.name if person.name else Name(),
        )
        return c


class Campaign(TimestampDoc, Deleteable, DateRange, Taggable, Labels):
    name: str = Field(..., description="The name of the campaign")
    description: Optional[str] = Field(default=None, description="The description of the campaign")

    contacts: list[Link[Contact]] = Field(
        default=None, description="The references to the people of the campaign"
    )
    companies: list[Link[Company]] = Field(
        default=None, description="The references to the companies of the campaign"
    )
    campaign_steps: list[Link["CampaignStep"]] = Field(default_factory=list)

    class Settings:
        name = "campaigns"
        equality_fields = ["name"]
        keep_nulls = False


class CampaignStep(TimestampDoc, Deleteable, DateRange, Taggable, Labels):
    campaign_id: PydanticObjectId = Field(..., description="The ID of the campaign")
    name: str = Field(..., description="The name of the step")
    step: int = Field(..., description="The order of the step")
    description: Optional[str] = Field(default=None, description="The description of the step")
    outreach_type: Optional[str] = Field(default=None, description="The type of outreach")
    contacts: list[Link[Contact]] = Field(
        default=None, description="The references to the people of the step"
    )
    companies: list[Link[Company]] = Field(
        default=None, description="The references to the companies of the step"
    )
    batches: list[Link["CampaignBatch"]] = Field(
        default=None, description="The references to the batches of the step"
    )
    notes: Optional[str] = Field(default=None, description="The notes of the batch")

    class Settings:
        name = "campaign_steps"
        equality_fields = ["campaign_id", "name"]
        keep_nulls = False


class CampaignBatch(TimestampDoc, Deleteable, DateRange, Taggable, Labels):
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
