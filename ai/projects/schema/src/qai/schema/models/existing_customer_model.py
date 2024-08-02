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
