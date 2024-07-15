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
