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
