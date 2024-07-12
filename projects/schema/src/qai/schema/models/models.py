import asyncio
import re
from datetime import UTC, datetime
from enum import StrEnum
from typing import (
    TYPE_CHECKING,
    Any,
    Optional,
    Self,
    Sequence,
    TypeAlias,
    TypeVar,
    cast,
)

from beanie import Document
from beanie import Link as BeanieLink
from beanie import PydanticObjectId
from beanie.odm.queries.find import FindOne as BeanieFindOne
from flexible_datetime import flextime
from nameparser import HumanName  # type: ignore
from pydantic import BaseModel, EmailStr, Field, field_validator
from qai.schema.extensions import ExtendedDocument

if TYPE_CHECKING:
    _T = TypeVar("_T", bound=Document)
    Link: TypeAlias = _T
    FindOne: TypeAlias = _T
else:
    Link = BeanieLink
    FindOne = BeanieFindOne


class ProvenanceType(StrEnum):
    OTHER = "other"
    MANUAL = "manual"
    AI_GENERATED = "ai_generated"


class ExcludeReason(StrEnum):
    ADDRESS_INVALID = "address_invalid"
    DOMAIN_INVALID = "domain_invalid"
    DOMAIN_FILTERED = "domain_filtered"
    EMAIL_BOUNCED = "email_bounced"
    EMAIL_FILTERED = "email_filtered"
    EMAIL_INVALID = "email_invalid"
    EMAIL_DOMAIN_FILTERED = "email_domain_filtered"
    EMAIL_UNVERIFIABLE = "email_unverifiable"
    NO_ADDRESS = "no_address"
    NO_COMPANY = "no_company"
    NO_COMPANY_DOMAIN = "no_company_domain"
    NO_EMAIL = "no_email"
    NO_JOB_TITLE = "no_job_title"
    NO_NAME = "no_name"
    NO_PERSON = "no_person"
    NO_PHONE = "no_phone"
    NO_SOCIAL_MEDIA = "no_social_media"
    PHONE_INVALID = "phone_invalid"
    SOCIAL_MEDIA_INVALID = "social_media_invalid"
    TITLE_FILTERED = "title_filtered"
    COMPANY_NAME_MISMATCH = "company_name_mismatch"

    def __str__(self):
        return self.value

    def __repr__(self):
        return self.value


class OutreachType(StrEnum):
    OTHER = "other"
    EMAIL = "email"
    PHONE = "phone"
    SOCIAL_MEDIA = "social_media"
    MAIL = "mail"
    IN_PERSON = "in_person"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    GITHUB = "github"
    ZOOM = "zoom"


class SexEnum(StrEnum):
    OTHER = "other"
    MALE = "male"
    FEMALE = "female"
    INTERSEX = "intersex"


class GenderEnum(StrEnum):
    OTHER = "other"
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non-binary"
    GENDERQUEER = "genderqueer"
    AGENDER = "agender"
    GENDERFLUID = "genderfluid"


class SocialMediaType(StrEnum):
    OTHER = "other"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    GITHUB = "github"


class EmailType(StrEnum):
    OTHER = "other"
    PERSONAL = "personal"
    WORK = "work"


class PhoneType(StrEnum):
    OTHER = "other"
    MOBILE = "mobile"
    HOME = "home"
    WORK = "work"
    TOLL_FREE = "toll_free"
    FAX = "fax"


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

    @property
    def full_name(self) -> str:
        return str(
            HumanName(
                first=self.first,
                middle=self.middle,
                last=self.last,
                suffix=self.suffix,
                title=self.title,
            )
        )

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
        default=SocialMediaType.OTHER, description="The social media type"
    )
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the address"
    )

    class Settings:
        equality_fields = ["url"]


class PhoneNumber(CreatedAtDoc):
    number: str = Field(..., description="The phone number")
    type: PhoneType = Field(default=PhoneType.OTHER, description="The phone type")
    notes: Optional[str] = Field(default=None, description="The phone number notes")
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the PhoneNumber"
    )

    class Settings:
        equality_fields = ["number"]


class Address(ExtendedDocument):
    street: Optional[str] = Field(default=None, description="The street address")
    street2: Optional[str] = Field(default=None, description="The street address")
    city: Optional[str] = Field(default=None, description="The city")
    state: Optional[str] = Field(default=None, description="The state")
    postal_code: Optional[str] = Field(default=None, description="The postal code")
    country: Optional[str] = Field(default=None, description="The country")
    current: Optional[bool] = Field(
        default=None, description="Whether the address is the current one"
    )
    notes: Optional[str] = Field(default=None, description="The address notes")
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the address"
    )
    raw: Optional[str] = Field(default=None, description="The raw address, to be parsed")

    class Settings:
        equality_fields = ["street", "street2", "city", "state", "postal_code", "country"]


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


class Person(CreatedAtDoc, Deleteable, Taggable, Labels):
    id: Optional[PydanticObjectId] = Field(
        default=None, description="The unique identifier of the person"
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
    sources: Optional[list[Provenance]] = Field(
        default=None, description="The sources of the person"
    )

    class Settings:
        name = "people"
        equality_fields = ["id"]
        keep_nulls = False
        ## TODO
        # indexes = [Indexed("name.first", pymongo.collation.), Indexed("name.last")]

    @property
    def full_name(self) -> str:
        if self.name:
            return self.name.full_name
        return ""

    def get_linkedin_url(self) -> Optional[str]:
        if not self.social_media:
            return None
        for sm in self.social_media:
            if sm.type == SocialMediaType.LINKEDIN:
                return sm.url
        return None

    def get_work_email(self) -> Optional[Email]:
        if not self.work_history:
            return None

        work_history = sorted(self.work_history, key=_sort_job_key, reverse=True)
        return work_history[0].email

    def get_work_title(self) -> Optional[str]:
        if not self.work_history:
            return None
        ## TODO: slintel doesn't have a start or end date
        ## so we can't sort by start date or end date for now
        # work_history = sorted(self.work_history, key=_sort_job_key, reverse=True)
        # return work_history[0].title
        return self.work_history[0].title


    def match_query(self) -> dict[str, Any]:
        query: List[dict[str, Any]] = []

        # Match by email
        if self.emails and isinstance(self.emails, list):
            email_conditions = [{"emails.address": re.compile(f"^{re.escape(email.address)}$", re.IGNORECASE)} 
                                for email in self.emails if email.address]
            if email_conditions:
                query.append({"$or": email_conditions})

        # Match by name and address
        if self.name and self.addresses and isinstance(self.addresses, list):
            for address in self.addresses:
                address_conditions = {}
                if self.name.first:
                    address_conditions["name.first"] = re.compile(f"^{re.escape(self.name.first)}$", re.IGNORECASE)
                if self.name.last:
                    address_conditions["name.last"] = re.compile(f"^{re.escape(self.name.last)}$", re.IGNORECASE)
                if address.street:
                    address_conditions["addresses.street"] = re.compile(f"^{re.escape(address.street)}$", re.IGNORECASE)
                if address.city:
                    address_conditions["addresses.city"] = re.compile(f"^{re.escape(address.city)}$", re.IGNORECASE)
                if address.state:
                    address_conditions["addresses.state"] = re.compile(f"^{re.escape(address.state)}$", re.IGNORECASE)
                if address.postal_code:
                    address_conditions["addresses.postal_code"] = address.postal_code
                if address.country:
                    address_conditions["addresses.country"] = re.compile(f"^{re.escape(address.country)}$", re.IGNORECASE)
                
                if len(address_conditions) > 0:
                    query.append({"$and": [{k: v} for k, v in address_conditions.items()]})
        ## TODO - clean up match conditions
        # # Match by name and job company ID
        # if self.name and self.work_history and isinstance(self.work_history, list):
        #     for job in self.work_history:
        #         if job.company_id and self.name.first and self.name.last:
        #             query.append({
        #                 "$and": [
        #                     {"name.first": re.compile(f"^{re.escape(self.name.first)}$", re.IGNORECASE)},
        #                     {"name.last": re.compile(f"^{re.escape(self.name.last)}$", re.IGNORECASE)},
        #                     {"work_history.company_id": job.company_id}
        #                 ]
        #             })

        # Match by social media profiles
        if self.social_media and isinstance(self.social_media, list):
            for sm in self.social_media:
                if sm.url and sm.type:
                    query.append({
                        "$and": [
                            {"social_media.url": sm.url},
                            {"social_media.type": str(sm.type)}
                        ]
                    })

        # # Match by phone number
        # if self.phone_numbers and isinstance(self.phone_numbers, list):
        #     for phone in self.phone_numbers:
        #         if phone.number and phone.type:
        #             query.append({
        #                 "$and": [
        #                     {"phone_numbers.number": phone.number},
        #                     {"phone_numbers.type": phone.type}
        #                 ]
        #             })

        if not query:
            raise ValueError(f"Couldn't create match_query for person {self}")

        q = {"$or": query}
        return q


class ExistingCustomer(ExtendedDocument, Taggable, Labels, Deleteable):
    company: Link["Company"] = Field(..., description="The reference to the company")
    company_id: PydanticObjectId = Field(..., description="The ID of the company")
    name: str = Field(..., description="The name of the company")

    class Settings:
        name = "existing-customers"
        equality_fields = ["company_id"]
        keep_nulls = False


class Company(CreatedAtDoc, Taggable, Labels, Deleteable):
    name: str = Field(..., description="The name of the company")
    domains: list[str] = Field(default_factory=list, description="The websites of the company")
    business_name: Optional[str] = Field(
        default=None,
        description="The official business name of the company, government registered.",
    )
    description: Optional[str] = Field(default=None, description="The description of the company")
    parent_company: Optional[Self] = None
    linkedin_id: Optional[int] = Field(default=None, description="The LinkedIn ID of the company")
    people: list[Link[Person]] = Field(
        default=None, description="The references to the people of the company"
    )
    emails: Optional[list[Email]] = Field(default=None, description="The emails of the company")
    is_branch: Optional[bool] = Field(default=None, description="Whether the company is a branch")
    is_entity: Optional[bool] = Field(default=None, description="Whether the company is an entity")
    location: Optional[Address] = Field(
        default=None, description="The location of the company's headquarters"
    )
    industries: Optional[list[str]] = Field(
        default=None, description="The industries of the company"
    )
    specialties: Optional[list[str]] = Field(
        default=None, description="The specialties of the company"
    )
    employee_range: Optional[str] = Field(
        default=None, description="The size range of employees in the company"
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
    existing_customers: Optional[list["Company"]] = Field(
        default=None, description="The existing customers of the company"
    )

    class Settings:
        name = "companies"
        equality_fields = ["id"]
        keep_nulls = False

    def match_query(self) -> dict[str, Any]:
        query: list[dict[str, Any]] = []

        # Match by ID
        if self.id:
            query.append({"_id": self.id})

        # Match by name and domains
        if self.name and self.domains:
            query.append({"$and": [{"name": self.name}, {"domains": {"$in": self.domains}}]})

        # Match by LinkedIn URL
        if self.social_media:
            linkedin_urls = [
                sm.url for sm in self.social_media if sm.type == SocialMediaType.LINKEDIN and sm.url
            ]
            if linkedin_urls:
                query.append({"$or": [{"social_media.url": url} for url in linkedin_urls]})

        # Match by LinkedIn ID
        if self.linkedin_id:
            query.append({"linkedin_id": self.linkedin_id})

        if not query:
            raise ValueError(f"Couldn't create match_query for company {self}")

        return {"$or": query}

    @classmethod
    def find_by_linkedin_url(cls, linkedin_url: str) -> dict[str, Any]:
        return {"social_media.url": linkedin_url}

    @classmethod
    def find_by_linkedin_url(cls, linkedin_url: str) -> dict[str, Any]:
        return {"social_media.url": linkedin_url}

    @field_validator("domains", mode="before")
    def strip_protocols(cls, v):
        if isinstance(v, list):
            v = [domain.lstrip("http://").lstrip("https://").lstrip("www.") for domain in v]
        return v

    def eq(self, other, nones_ok: bool = False, to_lower: bool = False):
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

    filter_emails: list[EmailStr] = Field(
        default_factory=list, title="List of emails to filter out"
    )
    filter_titles: list[str] = Field(default_factory=list, title="List of titles to filter out")
    filter_domains: list[str] = Field(default_factory=list, title="List of domains to filter out")
    include_emails: list[str] = Field(default_factory=list, title="List of emails to include")
    include_titles: list[str] = Field(default_factory=list, title="List of titles to include")

    ## TODO information about Ideal Customer Profile (ICP)

    class Settings:
        name = "campaigns"
        equality_fields = ["name"]
        keep_nulls = False

    @field_validator("filter_domains", mode="before")
    def strip_protocols(cls, v):
        if isinstance(v, list):
            v = [domain.lstrip("http://").lstrip("https://").lstrip("www.") for domain in v]
        return v

class ContactList(CreatedAtDoc, Deleteable, DateRange, Taggable, Labels):
    name: str = Field(..., description="The name of the contact list")
    description: Optional[str] = Field(default=None, description="The description of the contact list")

    contacts: list[Link[Contact]] = Field(
        default=None, description="The references to the people of the contact list"
    )

    class Settings:
        name = "contact_lists"
        equality_fields = ["name"]
        keep_nulls = False

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


## Load optional external parsers
try:
    print("Loading external parsers")
    from qai.schema.parsers.address_parser import transform_address

    print("Loaded external parsers")

    Address.from_str = transform_address
    print("Address.from_str set")
except ImportError as e:
    print(f"Failed to load external parsers: {e}")
    pass


def _sort_job_key(obj: Job):
    ## sort work_history by start_date and then end_date
    end_value = obj.end if obj.end is not None else float("inf")
    return (obj.start, end_value)
