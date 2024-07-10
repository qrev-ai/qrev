from typing import Optional, List
from pydantic import BaseModel, Field
from pydantic import BaseModel
from typing import Any
from beanie import PydanticObjectId
from copy import deepcopy
from qai.schema import ExtendedDocument
from qai.schema import (
    Campaign,
    CampaignBatch,
    CampaignOptions,
    CampaignStep,
    Company,
    Contact,
    ExistingCustomer,
    OutreachType,
    ExcludeReason,
    Person,
    Provenance,
)


def resolve(p: Person, other: Person, source: Provenance) -> Person:
    if p.sources is None:
        p.sources = []
    for s in p.sources:
        if source.source == s.source:
            return p
        
    if not p.name and other.name:
        p.name = other.name
    if not p.gender and other.gender:
        p.gender = other.gender
    p.emails = merge_lists(p.emails, other.emails)
    # p.social_media = merge_lists(p.social_media, other.social_media)
    # p.phone_numbers = merge_lists(p.phone_numbers, other.phone_numbers)
    # p.addresses = merge_lists(p.addresses, other.addresses)
    p.work_history = merge_lists(p.work_history, other.work_history)
    if other.sources:
        for source in other.sources:
            if source not in p.sources:
                p.sources.append(source)
    p.sources.append(source)
    return p


def find_in_list(item: ExtendedDocument, item_list: list[ExtendedDocument]) -> bool:
    for i in item_list:
        if item.eq(i, to_lower=True, nones_ok=True):
            return True
    return False


def merge_lists(existing: Optional[list[Any]], new: Optional[list[Any]]) -> Optional[List[Any]]:
    if existing is None:
        existing = []
    if new:
        for item in new:
            if not find_in_list(item, existing):
                existing.append(item)
    return existing if existing else None
