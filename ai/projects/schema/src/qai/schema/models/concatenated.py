### client_model.py

import json
from enum import StrEnum
from typing import TYPE_CHECKING, Any, Optional, Self, cast

from pydantic import Field, field_validator
from qai.schema.models.addons import CreatedAtDoc, Deleteable, Labels, Taggable
from qai.schema.models.address_model import Address
from qai.schema.models.email_model import Email
from qai.schema.models.person_model import Person
from qai.schema.models.company_model import Company
from qai.schema.models.qbeanie import Link
from qai.schema.models.social_media_model import SocialMedia, SocialMediaType
from qai.schema.utils.utils import clean_domain

class Client(CreatedAtDoc, Deleteable, Taggable, Labels):
    name: str = Field(..., description="The name of the client")
    client_id: Optional[str] = Field(default=None, description="The unique identifier of the client")
    company: Optional[Link[Company]] = Field(default=None, description="The client company")


### phone_number_model.py

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


### contact_model.py

from typing import TYPE_CHECKING, Any, Optional, TypeVar

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
    from qai.schema.models.outreach.campaign_model import Campaign

T = TypeVar('T', bound='Contact')


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
        found = await Contact.find_or_insert(contact)
        if not found:
            raise ValueError(f"Couldn't find or insert contact {contact}")
        return found

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


### existing_customer_model.py

from typing import TYPE_CHECKING

from beanie import PydanticObjectId
from pydantic import Field

from qai.schema.extensions import ExtendedDocument

from qai.schema.models.addons import Deleteable, Labels, Taggable
from qai.schema.models.qbeanie import Link

if TYPE_CHECKING:
    from .company_model import Company


class ExistingCustomer(ExtendedDocument, Taggable, Labels, Deleteable):
    company: Link["Company"] = Field(..., description="The reference to the company")
    company_id: PydanticObjectId = Field(..., description="The ID of the company")
    name: str = Field(..., description="The name of the company")

    class Settings:
        name = "existing-customers"
        equality_fields = ["company_id"]
        keep_nulls = False


### email_model.py

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


### company_model.py

import json
from enum import StrEnum
from typing import TYPE_CHECKING, Any, Optional, Self, cast

from pydantic import Field, field_validator

from qai.schema.models.addons import CreatedAtDoc, Deleteable, Labels, Taggable
from qai.schema.models.address_model import Address
from qai.schema.models.email_model import Email
from qai.schema.models.person_model import Person
from qai.schema.models.phone_number_model import PhoneNumber
from qai.schema.models.qbeanie import Link
from qai.schema.models.social_media_model import SocialMedia, SocialMediaType
from qai.schema.utils.utils import clean_domain


class CompanyType(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"
    EDUCATIONAL = "educational"
    NON_PROFIT = "non_profit"
    GOVERNMENT = "government"
    SELF_EMPLOYED = "self_employed"
    PARTNERSHIP = "partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    OTHER = "other"


class Company(CreatedAtDoc, Taggable, Labels, Deleteable):
    name: str = Field(..., description="The name of the company")
    domains: list[str] = Field(default_factory=list, description="The websites of the company")
    business_name: Optional[str] = Field(
        default=None,
        description="The official business name of the company, government registered.",
    )
    company_type: Optional[CompanyType] = Field(default=None, description="The type of the company")
    description: Optional[str] = Field(default=None, description="The description of the company")
    tagline: Optional[str] = Field(default=None, description="The tagline of the company")
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

    @property
    def website(self) -> str:
        if self.domains:
            return self.domains[0]
        raise ValueError(f"No website for company domains={self.domains}. ")

    @classmethod
    def find_by_linkedin_url(cls, linkedin_url: str) -> dict[str, Any]:
        return {"social_media.url": linkedin_url}

    @field_validator("domains", mode="before")
    def strip_protocols(cls, v):
        if isinstance(v, list):
            return [clean_domain(domain) for domain in v]
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

    def full_print(self):
        """Print the company with all its fields"""
        return self.model_dump(by_alias=True, exclude_none=True)

    @property
    def summary(self) -> str:
        return json.dumps(
            self.summary_json(
                exclude_fields=[
                    "start",
                    "end",
                    "source",
                    "created_at",
                    "updated_at",
                    "deleted_at",
                    "is_deleted",
                ],
                exclude_empty=True,
            )
        )


### models.py

from enum import StrEnum


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


### social_media_model.py

from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, Field

from qai.schema.models.addons import Provenance


class SocialMediaType(StrEnum):
    OTHER = "other"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    GITHUB = "github"


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


### addons.py

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


### mongo_model.py

from typing import Optional

from pydantic import BaseModel, Field


class MongoConfig(BaseModel):
    uri: str = Field(..., title="MongoDB URI")
    database: Optional[str] = Field(default=None, title="MongoDB Database")
    collection: Optional[str] = Field(default=None, title="MongoDB Collection")


### job_model.py

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


### __init__.py



### name_model.py

from typing import Optional

from nameparser import HumanName
from pydantic import BaseModel, Field

from qai.schema.models.addons import CreatedAtDoc, Provenance


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
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the PhoneNumber"
    )

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
            provenance=None
        )


### person_model.py

import json
import re
from typing import Any, Optional

from beanie import PydanticObjectId
from pydantic import Field
from qai.schema.models.addons import (
    CreatedAtDoc,
    Deleteable,
    Labels,
    Provenance,
    Taggable,
)
from qai.schema.models.address_model import Address
from qai.schema.models.email_model import Email
from qai.schema.models.job_model import Job, _sort_job_key
from qai.schema.models.models import GenderEnum
from qai.schema.models.name_model import Name
from qai.schema.models.phone_number_model import PhoneNumber
from qai.schema.models.social_media_model import SocialMedia, SocialMediaType


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
    education_history: Optional[list[Job]] = Field(
        default=None, description="The education history of the person"
    )
    sources: Optional[list[Provenance]] = Field(
        default=None, description="The sources of the person"
    )
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the person"
    )
    activities: Optional[list[dict[Any, Any]]] = Field(
        default=None, description="The online activities of the person"
    )
    skills: Optional[list[str]] = Field(default=None, description="The skills of the person")

    additional_data: Optional[dict[str, Any]] = Field(
        default=None, description="Additional data of the person, a catch-all field"
    )

    class Settings:
        name = "people"
        equality_fields = ["id"]
        keep_nulls = False

    @property
    def full_name(self) -> str:
        if self.name:
            return self.name.full_name
        return ""

    @property
    def work_email(self) -> Optional[str]:
        work_email = self.get_work_email()
        if work_email:
            return work_email.address
        if self.emails:
            for email in self.emails:
                if email.type == "work":
                    return email.address
        return None

    @property
    def work_title(self) -> Optional[str]:
        work_title = self.get_work_title()
        if work_title:
            return work_title
        return None

    @property
    def job(self) -> Job:
        if self.work_history:
            return self.work_history[0]
        raise ValueError("No job found for person")

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

        # Check if all jobs have both start and end dates
        all_jobs_have_dates = all(job.start and job.end for job in self.work_history)

        if all_jobs_have_dates:
            # Sort the jobs only if all of them have dates
            sorted_jobs = sorted(self.work_history, key=_sort_job_key, reverse=True)
            return sorted_jobs[0].title
        else:
            # If any job lacks dates, return the first job's title without sorting
            return self.work_history[0].title

    def match_query(self) -> dict[str, Any]:
        query: list[dict[str, Any]] = []

        # Match by email
        if self.emails and isinstance(self.emails, list):
            email_conditions = [
                {"emails.address": re.compile(f"^{re.escape(email.address)}$", re.IGNORECASE)}
                for email in self.emails
                if email.address
            ]
            if email_conditions:
                query.append({"$or": email_conditions})

        # Match by name and address
        if self.name and self.addresses and isinstance(self.addresses, list):
            for address in self.addresses:
                address_conditions = {}
                if self.name.first:
                    address_conditions["name.first"] = re.compile(
                        f"^{re.escape(self.name.first)}$", re.IGNORECASE
                    )
                if self.name.last:
                    address_conditions["name.last"] = re.compile(
                        f"^{re.escape(self.name.last)}$", re.IGNORECASE
                    )
                if address.street:
                    address_conditions["addresses.street"] = re.compile(
                        f"^{re.escape(address.street)}$", re.IGNORECASE
                    )
                if address.city:
                    address_conditions["addresses.city"] = re.compile(
                        f"^{re.escape(address.city)}$", re.IGNORECASE
                    )
                if address.state:
                    address_conditions["addresses.state"] = re.compile(
                        f"^{re.escape(address.state)}$", re.IGNORECASE
                    )
                if address.postal_code:
                    address_conditions["addresses.postal_code"] = address.postal_code
                if address.country:
                    address_conditions["addresses.country"] = re.compile(
                        f"^{re.escape(address.country)}$", re.IGNORECASE
                    )

                if len(address_conditions) > 0:
                    query.append({"$and": [{k: v} for k, v in address_conditions.items()]})

        # Match by social media profiles
        if self.social_media and isinstance(self.social_media, list):
            for sm in self.social_media:
                if sm.url and sm.type:
                    query.append(
                        {
                            "$and": [
                                {"social_media.url": sm.url},
                                {"social_media.type": str(sm.type)},
                            ]
                        }
                    )

        if not query:
            raise ValueError(f"Couldn't create match_query for person {self}")

        q = {"$or": query}
        return q

    @property
    def summary(self) -> str:
        return json.dumps(
            self.summary_json(
                exclude_fields=[
                    "start",
                    "end",
                    "source",
                    "created_at",
                    "updated_at",
                    "deleted_at",
                    "is_deleted",
                ]
            )
        )


### address_model.py

import importlib
import re
from logging import getLogger
from typing import Any, Callable, Optional, TypeVar, cast

from addressformatting import AddressFormatter  # type: ignore
from pydantic import Field, field_validator
from qai.schema.extensions import ExtendedDocument
from qai.schema.models.addons import Provenance

log = getLogger(__name__)

T = TypeVar("T", bound="Address")


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

    def equality_hash(self):
        ## make a tuple of all equality_fields
        all_kv = self.model_fields.items()
        return tuple([getattr(self, k) for k, v in all_kv if k in self.Settings.equality_fields])

    @field_validator("street", "street2", "city", "state", "postal_code", "country", "notes", "raw")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v

    @classmethod
    def from_str(cls: type[T], s: str, *args, **kwargs) -> T:
        return cls.parse_address(s=s, *args, **kwargs)  # type: ignore

    @classmethod
    def from_dict_mapping(cls, data: dict[str, Any], mapping: dict[str, str]) -> "Address":
        d = {
            address_field: data[dict_key]
            for dict_key, address_field in mapping.items()
            if dict_key in data
        }
        return cls(**d)

    @classmethod
    def parse_address(cls: type["T"], s: str, *args, **kwargs) -> T:
        if not hasattr(cls, "_parse_address"):
            setattr(cls, "_parse_address", _load_address_parsers())
            assert cls._parse_address, "No address parser loaded"  # type: ignore
        try:
            return cls._parse_address(s=s, *args, **kwargs)  # type: ignore
        except:
            return cast(T, Address(raw=s))

    class Settings:
        equality_fields = ["street", "street2", "city", "state", "postal_code", "country"]

    def __str__(self) -> str:
        return self.format_address(self)

    @classmethod
    def format_address(cls, address: "Address", one_line: bool = False) -> str:
        address_dict = {
            "road": address.street,
            "house": address.street2,
            "city": address.city,
            "state": address.state,
            "postcode": address.postal_code,
            "country": address.country,
        }

        # Remove None values
        data_dict = {k: v for k, v in address_dict.items() if v is not None}
        formatter = AddressFormatter()
        # Format the address using address-formatting
        if one_line:
            formatted_address = formatter.one_line(data_dict, country=address.country)  # type: ignore
        else:
            formatted_address = formatter.format(data_dict, country=address.country)  # type: ignore
        # Ensure state is included if it's in the original address
        if address.state and address.state not in formatted_address:
            if one_line:
                parts = formatted_address.split(", ")
                if len(parts) >= 2:
                    parts.insert(-1, address.state)
                formatted_address = ", ".join(parts)
            else:
                lines = formatted_address.split("\n")
                if len(lines) >= 2:
                    lines.insert(-1, address.state)
                formatted_address = "\n".join(lines)

        # Remove any whitespace before or after newlines, and strip the entire string
        formatted_address = re.sub(r"\s*\n\s*", "\n", formatted_address.strip())
        if not formatted_address:
            formatted_address = address.raw or ""
        return formatted_address.strip()


def _load_address_parser(module_path: str) -> Optional[Callable]:
    try:
        module = importlib.import_module(module_path)
        parse_address = getattr(module, "parse_address")
        return parse_address
    except ImportError:
        log.debug(f"Failed to import {module_path} parser")
    except AttributeError:
        log.debug(f"{module_path} parser does not have parse_address function")
    return None


def _basic_parse_address(s: str, *args, **kwargs) -> Address:
    return Address(raw=s)


def _load_address_parsers() -> Callable:
    log.debug("Loading external Address parsers")

    parsers = [
        ("postal", "qai.schema.parsers.address_parser_postal"),
        ("pyap", "qai.schema.parsers.address_parser_pyap"),
    ]

    for parser_name, module_path in parsers:
        parse_address = _load_address_parser(module_path)
        if parse_address:
            log.debug(f"Loaded {parser_name} parser")
            return parse_address
    else:
        log.error("No Address parser could be loaded")
        return _basic_parse_address


### qbeanie.py

from typing import TYPE_CHECKING, TypeAlias, TypeVar

from beanie import Document
from beanie import Link as BeanieLink
from beanie.odm.queries.find import FindOne as BeanieFindOne

if TYPE_CHECKING:
    _T = TypeVar("_T", bound=Document)
    Link: TypeAlias = _T
    FindOne: TypeAlias = _T
else:
    Link = BeanieLink
    FindOne = BeanieFindOne



### outreach/campaign_model.py

import json
import os
import tomllib as toml
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
from qai.schema.models.models import OutreachType
from qai.schema.models.mongo_model import MongoConfig
from qai.schema.models.outreach.email import Outreach
from qai.schema.models.qbeanie import Link

sentinel = object()


class EnrichmentSource(BaseModel):
    type: str
    include: bool


class DataSource(BaseModel):
    source: str
    type: str


class ExcludeOptions(BaseModel):
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


# class CampaignOptions(ConfigSettings):
#     name: str
#     sources: list[DataSource]
#     exclude: Optional[ExcludeOptions] = None
#     enrichments: list[EnrichmentSource]
#     outreach: Outreach

#     model_config = ConfigDict(extra="allow")


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

    # campaign_steps: Optional[list[Link["CampaignStep"]]] = Field(default_factory=list)
    exclude: Optional[ExcludeOptions] = Field(
        default=None, description="The exclude options of the campaign"
    )
    enrichments: Optional[list[EnrichmentSource]] = Field(
        default=None, description="Which enrichments were used in the campaign. Linkedin, Web, etc"
    )
    sources: Optional[list[DataSource]] = Field(
        default=None, description="The sources of the campaign"
    )
    ## TODO information about Ideal Customer Profile (ICP)

    class Settings:
        name = "campaigns"
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


### outreach/email.py

import json
import tomllib as toml
from pathlib import Path
from typing import Optional

from pi_conf import ConfigDict, ConfigSettings
from pi_conf.config_settings import ConfigDict, ConfigSettings
from pydantic import BaseModel, Field, field_validator, model_validator

MIN_SCORE = 1
MAX_SCORE = 10


class Email(BaseModel):
    subject: str = Field(..., description="The generated subject line of the email")
    body: str = Field(..., description="The full text content of the generated email body")


class Rule(BaseModel):
    instruction: str = Field(..., description="The condition to evaluate in the email")
    importance: int = Field(
        default=5, description="How important this rule is", ge=MIN_SCORE, le=MAX_SCORE
    )
    name: Optional[str] = Field(default=None, description="An optional name for this rule")


class RuleBasedModel(BaseModel):
    rules: list[Rule] = Field(default_factory=list, description="The rules to use")
    rules_file: Optional[Path] = Field(default=None, description="File containing the rules")

    def model_post_init(self, __context):
        self._load_rules()

    def _load_rules(self):
        if self.rules_file:
            file_content = self.rules_file.read_text()
            file_extension = self.rules_file.suffix.lower()

            if file_extension == ".toml":
                rules_data = toml.loads(file_content)["rules"]
            elif file_extension == ".json":
                rules_data = json.loads(file_content)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}. Use .toml or .json")

            self.rules = [Rule(**rule) for rule in rules_data]

    @field_validator("rules")
    @classmethod
    def validate_rules(cls, v, info):
        if not v and not info.data.get("rules_file"):
            raise ValueError("Either rules or rules_file must be provided")
        return v

    @field_validator("rules_file", mode="before")
    @classmethod
    def validate_rule_file_path(cls, v):
        if v is not None:
            v = Path(v).expanduser()
            if not v.exists():
                raise FileNotFoundError(f"File does not exist: {v}")
            if v.suffix.lower() not in [".toml", ".json"]:
                raise ValueError(
                    f"Unsupported file format: {v.suffix}. Use .toml or .json for rules_file"
                )
            return v
        return v

    @model_validator(mode="after")
    def final_validate(self):
        if not self.rules:
            raise ValueError("rules cannot be empty or None")
        return self


class Generation(RuleBasedModel):
    system_prompt: str = Field(
        default="", description="The system prompt to generate the email with"
    )
    system_prompt_file: Optional[Path] = Field(
        default=None, description="File containing the system prompt"
    )
    user_prompt: str = Field(default="", description="The user prompt to generate the email with")
    user_prompt_file: Optional[Path] = Field(
        default=None, description="File containing the user prompt"
    )
    model: Optional[str] = Field(default=None)

    def model_post_init(self, __context):
        super().model_post_init(__context)
        self._load_system_prompt()
        self._load_user_prompt()

    def _load_system_prompt(self):
        if self.system_prompt_file:
            with open(self.system_prompt_file, "r") as f:
                self.system_prompt = f.read().strip()

    def _load_user_prompt(self):
        if self.user_prompt_file:
            with open(self.user_prompt_file, "r") as f:
                self.user_prompt = f.read().strip()

    @field_validator("system_prompt_file", "user_prompt_file", mode="before")
    @classmethod
    def validate_prompt_file_path(cls, v):
        if v is not None:
            v = Path(v).expanduser()
            if not v.exists():
                raise FileNotFoundError(f"File does not exist: {v}")
            return v
        return v

    @field_validator("system_prompt")
    @classmethod
    def validate_system_prompt(cls, v, info):
        if not v and not info.data.get("system_prompt_file"):
            raise ValueError("Either system_prompt or system_prompt_file must be provided")
        return v

    @field_validator("user_prompt")
    @classmethod
    def validate_user_prompt(cls, v, info):
        if not v and not info.data.get("user_prompt_file"):
            raise ValueError("Either user_prompt or user_prompt_file must be provided")
        return v

    @model_validator(mode="after")
    def final_validate(self):
        if not self.system_prompt:
            raise ValueError("system_prompt cannot be empty or None")
        if not self.user_prompt:
            raise ValueError("user_prompt cannot be empty or None")
        return self


class Scoring(RuleBasedModel):
    pass  # All functionality is inherited from RuleBasedModel


class InheritableSettings(BaseModel):
    @property
    def inheritable_fields(self):
        return set(self.model_fields.keys())

    def inherit_from(self, parent: "InheritableSettings"):
        for field in self.inheritable_fields:
            if getattr(self, field) is None:
                setattr(self, field, getattr(parent, field))


class EmailSettings(InheritableSettings):
    overwrite_existing: Optional[bool] = Field(default=None)
    include_signature: Optional[bool] = None
    signature: Optional[str] = None
    generated_emails_directory: Optional[str] = Field(default=None)
    generated_intermediate_emails_directory: Optional[str] = Field(default=None)
    sender_person_file: Optional[str] = Field(default=None)
    sender_company_file: Optional[str] = Field(default=None)


class EmailGeneratorSettings(ConfigSettings):
    model: str = "claude-3-haiku-20240307"
    generation: Generation = Field(
        default_factory=lambda: Generation(), description="The rules to generate the email with"
    )
    scoring: Scoring = Field(
        default_factory=Scoring, description="The rules to evaluate the email against"
    )

    model_config = ConfigDict(
        toml_table_header="outreach.steps.email_generation",
    )
    email_settings: EmailSettings = Field(default_factory=EmailSettings)
    iterations: int = 3


class EmailFixedText(BaseModel):
    subject: str = Field(..., description="The fixed subject of the email")
    body: str = Field(..., description="The fixed text of the email")
    email_settings: EmailSettings = Field(default_factory=EmailSettings)


class Step(BaseModel):
    order: int = Field(..., description="The order of the step")
    name: str = Field(..., description="The name of the step")
    email_generation: Optional[EmailGeneratorSettings] = Field(default=None)
    email_fixed_text: Optional[EmailFixedText] = Field(default=None)
    email_settings: EmailSettings = Field(default_factory=EmailSettings)

    def apply_email_settings_inheritance(self, outreach_settings: EmailSettings):
        self.email_settings.inherit_from(outreach_settings)
        if self.email_generation:
            self.email_generation.email_settings.inherit_from(self.email_settings)
        if self.email_fixed_text:
            self.email_fixed_text.email_settings.inherit_from(self.email_settings)


class Outreach(BaseModel):
    overwrite_existing: bool = False
    email_settings: EmailSettings = Field(default_factory=EmailSettings)
    steps: list[Step] = Field(default_factory=list)

    def __init__(self, **data):
        super().__init__(**data)
        self.apply_email_settings_inheritance()

    def apply_email_settings_inheritance(self):
        for step in self.steps:
            step.apply_email_settings_inheritance(self.email_settings)
