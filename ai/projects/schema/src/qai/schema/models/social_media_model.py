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
