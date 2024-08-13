# import re
# from enum import StrEnum
# from typing import Any, List, Optional
# from uuid import UUID, uuid4

# from pydantic import BaseModel, Field, field_validator, model_validator


# class MatchingAlgorithm(StrEnum):
#     BAG_OF_WORDS = "Bag of Words"
#     EXACT = "Exact"
#     REGEX = "Regex"
#     CONTAINS = "Contains"


# class Suggester(BaseModel):
#     input: Optional[str] = Field(default=None, description="Suggested input")
#     weight: Optional[str] = Field(default=None, description="Weight of the suggestion")

#     @model_validator(mode="before")
#     @classmethod
#     def empty_str_to_none(cls, values: dict[str, Any]) -> dict[str, Any]:
#         return {key: (value if value != "" else None) for key, value in values.items()}


# class Location(BaseModel):
#     city: Optional[str]
#     state: Optional[str]
#     country: Optional[str]

#     @classmethod
#     def from_list(cls, location_list: List[Optional[str]]):
#         if len(location_list) == 3:
#             return cls(city=location_list[0], state=location_list[1], country=location_list[2])
#         raise ValueError("Location list must have exactly 3 elements: [city, state, country]")


# class Lead(BaseModel):
#     lead_division: Optional[str] = Field(default=None, description="Lead division in the company")
#     country: Optional[str] = Field(default=None, description="Country of the lead")
#     company_id: Optional[str] = Field(default=None, description="ID of the company")
#     decision_making_power: Optional[str] = Field(
#         default=None, description="Decision making power of the lead"
#     )
#     city: Optional[str] = Field(default=None, description="City of the lead")
#     lead_titles: Optional[str] = Field(default=None, description="Titles of the lead")
#     company_website: Optional[str] = Field(default=None, description="Company's website")
#     work_phone: Optional[str] = Field(default=None, description="Work phone of the lead")
#     company_country: Optional[str] = Field(default=None, description="Country of the company")
#     company_phone_numbers: Optional[str] = Field(
#         default=None, description="Company's phone numbers"
#     )
#     lead_location: Optional[list[Location | str]] = Field(
#         default=None, description="Location of the lead"
#     )
#     company_state: Optional[str] = Field(default=None, description="State of the company")
#     phone: Optional[str] = Field(default=None, description="Phone number of the lead")
#     company_name: Optional[str] = Field(default=None, description="Name of the company")
#     name: Optional[str] = Field(default=None, description="Name of the lead")
#     company_city: Optional[str] = Field(default=None, description="City of the company")
#     company_website_suggester: Optional[Suggester] = Field(
#         default=None, description="Suggester for the company's website"
#     )
#     company_location: Optional[list[Location | str]] = Field(
#         default=None, description="Location of the company"
#     )
#     state: Optional[str] = Field(default=None, description="State of the lead")
#     linkedin_url: Optional[str] = Field(default=None, description="LinkedIn URL of the lead")
#     email: Optional[str] = Field(default=None, description="Email of the lead")
#     company_name_suggester: Optional[Suggester] = Field(
#         default=None, description="Suggester for the company's name"
#     )
#     id: str = Field(description="Unique identifier for the lead")

#     qid: UUID = Field(description="Qai ID", default_factory=uuid4)

#     class Config:
#         populate_by_name = True

#     def to_bson(self) -> dict[str, Any]:
#         data = self.model_dump()
#         data["qid"] = str(data["qid"])  # Convert UUID to string
#         return data

#     @field_validator("qid", mode="before")
#     def str_to_uuid(cls, v: Any) -> UUID:
#         if isinstance(v, str):
#             return UUID(v)
#         return v

#     @field_validator("lead_location", "company_location", mode="before")
#     def location_from_list(cls, v):
#         if isinstance(v, list):
#             return Location.from_list(v)
#         return v

#     @model_validator(mode="before")
#     @classmethod
#     def empty_str_to_none(cls, values: dict[str, Any]) -> dict[str, Any]:
#         return {key: (value if value != "" else None) for key, value in values.items()}

#     def has_required_fields(self, required_fields: List[str]) -> bool:
#         return all(getattr(self, field) for field in required_fields)

#     def title_matches(
#         self,
#         filter_titles: List[str],
#         matching_algorithms: List[MatchingAlgorithm] = [
#             MatchingAlgorithm.BAG_OF_WORDS,
#             MatchingAlgorithm.CONTAINS,
#         ],
#     ) -> bool:
#         if not self.lead_titles:
#             return False
#         filter_titles_bow = [set(title.split(" ")) for title in filter_titles]

#         for algorithm in matching_algorithms:
#             if algorithm == MatchingAlgorithm.BAG_OF_WORDS:
#                 job_title = set(self.lead_titles.split(" "))
#                 if any(job_title.issubset(title) for title in filter_titles_bow):
#                     return True
#             elif algorithm == MatchingAlgorithm.EXACT:
#                 if self.lead_titles in filter_titles:
#                     return True
#             elif algorithm == MatchingAlgorithm.REGEX:
#                 if any(
#                     re.search(title, self.lead_titles, re.IGNORECASE) for title in filter_titles
#                 ):
#                     return True
#             elif algorithm == MatchingAlgorithm.CONTAINS:
#                 if any(title in self.lead_titles for title in filter_titles):
#                     return True
#         return False
