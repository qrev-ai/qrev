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
