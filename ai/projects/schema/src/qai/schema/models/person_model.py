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
from qai.schema.models.education_model import Education
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
    education_history: Optional[list[Education]] = Field(
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

    def get_linkedin_vanityname(self) -> Optional[str]:
        url = self.get_linkedin_url()
        return url.split("/")[-1] if url else None

    def _get_work_email_from_personal_emails(self) -> Optional[Email]:
        if not self.emails:
            return None

        for email in self.emails:
            if email.type == "work":
                return email

        return None

    def get_work_email(self) -> Optional[Email]:
        if not self.work_history:
            return self._get_work_email_from_personal_emails()

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
