from typing import Optional
from uuid import UUID, uuid4

import pydantic
from pydantic import BaseModel, ConfigDict, Field, ValidationError


class RequestModel(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    mock: Optional[bool] = False
    token: Optional[str] = None

    def to_params(self) -> dict:
        return self.model_dump()

class CompanyChatbotModel(RequestModel):
    query: str
    user_id: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    asynchronous: Optional[str] = False
    model: Optional[dict] = None
    uploaded_data: Optional[list] = None
    sender_company: Optional[dict] = None
    sender_person: Optional[dict] = None
    model_config = ConfigDict(extra="allow")

    @pydantic.model_validator(mode="after")
    def validate_company(self):

        ## If company_id is not provided, then company_name must be provided
        if not self.company_id and not self.company_name:
            raise ValidationError("company_id or company_name must be provided.")
        ## if both company_id and company_name are provided, then throw an error
        if self.company_id and self.company_name:
            raise ValidationError(
                f"company_id and company_name cannot both be provided. "
                f"Got {self.company_id} and {self.company_name}"
            )
        return self

    def _fill_company_info(self, website_2_id: dict[str, str], id_2_website: dict[str, str]):
        if self.company_name:
            self.company_id = website_2_id.get(self.company_name)
        else:
            self.company_name = id_2_website.get(self.company_id)
        return self
            


class CampaignInputModel(RequestModel):
    query: str
    user_id: str
    session_id: Optional[str] = Field(alias="sequence_id", default=None)
    model: Optional[dict] = None
    uploaded_data: Optional[list[dict]] = None
    sender_company: Optional[dict] = None
    sender_person: Optional[dict] = None
    on_complete_emails_url: Optional[str] = Field(alias="asynchronous", default=None)

    model_config = ConfigDict(
        extra="allow",
    )

    def to_params(self):
        remove_keys = set(
            [
                "query",
                "user_id",
                "session_id",
                "company_id",
                "conversation",
            ]
        )
        remove_keys |= set(RequestModel.model_fields.keys())
        remove_keys.add("query")
        d = self.model_dump()
        people_list = d.pop("uploaded_data", None)
        if people_list:
            pdict = {}
            for p in people_list:
                pid = p.get("id")
                if not pid:
                    pid = str(uuid4())
                pdict[pid] = p
        d["on_complete_emails_url"] = d.pop("asynchronous", None)
        d["from_person"] = d.pop("sender_person", None)
        d["from_company"] = d.pop("sender_company", None)
        d["model_config"] = d.pop("model", None)

        for k in remove_keys:
            d.pop(k, None)

        return d
