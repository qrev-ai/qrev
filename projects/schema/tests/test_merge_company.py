from typing import Dict, List, Optional, Self

import pytest
from pydantic import BaseModel, Field
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# from qai.schema.mergers.company_merger import merge_companies
from qai.schema.mergers.merge import (
    HIGH_PRIORITY,
    LOW_PRIORITY,
    NORMAL_PRIORITY,
    Priority,
    merge_model,
)
from qai.schema.models.models import Address, Company

def test_simple_merge():
    c1 = Company(name="TechCorp", domains=["techcorp.com"], linkedin_id=12345)
    c2 = Company(name="TechInc", domains=["techinc.com"], business_name="Technology Incorporated")

    print(f"c1 before merge: {c1}")
    print(f"c2 before merge: {c2}")
    merge_model(source=c2, target=c1, source_priority=HIGH_PRIORITY, target_priority=NORMAL_PRIORITY)
    assert c1.name == "TechInc"
    assert c1.domains == ["techcorp.com", "techinc.com"]
    assert c1.linkedin_id == 12345
    assert c1.business_name == "Technology Incorporated"

def test_simple_merge2():
    c1 = Company(name="TechCorp", domains=["techcorp.com"], linkedin_id=12345)
    c2 = Company(name="TechInc", domains=["techinc.com"], business_name="Technology Incorporated")

    merge_model(source=c2, target=c1, source_priority=NORMAL_PRIORITY, target_priority=LOW_PRIORITY)
    assert c1.name == "TechInc"
    assert c1.domains == ["techcorp.com", "techinc.com"]
    assert c1.linkedin_id == 12345
    assert c1.business_name == "Technology Incorporated"


def test_list_merge():
    c1 = Company(
        name="TechCorp",
        addresses=[
            Address(street="123 Main St", city="Anytown"),
            Address(street="456 Oak Rd", city="Somewhere"),
        ],
    )
    c2 = Company(
        name="TechInc",
        addresses=[
            Address(street="123 Main St", city="Anytown"),
            Address(street="789 Pine Ave", city="Elsewhere"),
        ],
    )

    merge_model(
        source=c2, target=c1, source_priority=NORMAL_PRIORITY, target_priority=NORMAL_PRIORITY
    )
    assert c1.addresses
    assert len(c1.addresses) == 3
    assert any(a.street == "789 Pine Ave" and a.city == "Elsewhere" for a in c1.addresses)


def test_dict_merge():
    c1 = Company(name="TechCorp", revenues={"2020": 1000000, "2021": 1500000})
    c2 = Company(name="TechInc", revenues={"2021": 2000000, "2022": 2500000})

    logger.info("Before merge:")
    logger.info(f"c1 revenues: {c1.revenues}")
    logger.info(f"c2 revenues: {c2.revenues}")

    merge_model(c2, c1, NORMAL_PRIORITY, HIGH_PRIORITY)
    
    logger.info("After merge:")
    logger.info(f"Actual c1.revenues: {c1.revenues}")
    expected = {"2020": 1000000, "2021": 1500000, "2022": 2500000}
    logger.info(f"Expected revenues: {expected}")
    
    assert c1.revenues
    assert set(c1.revenues.keys()) == set(expected.keys()), "Keys don't match"
    for key in expected:
        assert c1.revenues[key] == expected[key], f"Value mismatch for key {key}"

def test_none_values():
    c1 = Company(name="TechCorp", linkedin_id=12345, business_name="Tech Corporation")
    c2 = Company(name="TechInc", linkedin_id=None, business_name=None)

    merge_model(c2, c1, NORMAL_PRIORITY, LOW_PRIORITY)
    assert c1.name == "TechInc"
    assert c1.linkedin_id == 12345  # None should not overwrite existing value
    assert c1.business_name == "Tech Corporation"  # None should not overwrite existing value

    c3 = Company(name="NewCorp", linkedin_id=None, business_name=None)
    c4 = Company(name="OldCorp", linkedin_id=67890, business_name="Old Corporation")

    merge_model(c4, c3, NORMAL_PRIORITY, HIGH_PRIORITY)
    assert c3.name == "NewCorp"
    assert c3.linkedin_id == 67890  # Non-None value should be used even with lower priority

if __name__ == "__main__":
    pytest.main([__file__])
