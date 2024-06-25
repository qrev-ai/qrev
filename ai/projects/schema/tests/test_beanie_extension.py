# import monkey_patch_mock_beanie
import pytest

if __name__ == "__main__":
    pytest.main([__file__])

from typing import Optional

from beanie import PydanticObjectId
from pydantic import Field

from qai.schema.extensions import ExtendedDocument


def test_get_base_url():
    url = "https://www.example.com"
    result = "example.com"
    assert ExtendedDocument.get_base_url(url) == result


def test_get_base_url_with_sub():
    url = "https://www.example.com/subpage"
    result = "example.com"
    assert ExtendedDocument.get_base_url(url) == result


def test_get_base_url_with_http():
    url = "http://www.example.com"
    result = "example.com"
    assert ExtendedDocument.get_base_url(url) == result


def test_get_base_url_without_http():
    url = "www.example.com"
    result = "example.com"
    assert ExtendedDocument.get_base_url(url) == result


def test_eq_with_nones() -> None:

    class TestDoc(ExtendedDocument):
        id: Optional[PydanticObjectId] = Field(default=None, description="The id")
        street: Optional[str] = Field(default=None, description="The street address")
        city: Optional[str] = Field(default=None, description="The city")
        state: Optional[str] = Field(default=None, description="The state")
        postal_code: Optional[str] = Field(default=None, description="The postal code")
        country: Optional[str] = Field(default=None, description="The country")

        class Settings:
            equality_fields = ["street", "city", "state", "postal_code", "country"]

    doc1 = TestDoc(street=None, city="Springfield", state="IL", postal_code=None, country="USA")
    doc2 = TestDoc(street=None, city="Springfield", state="IL", postal_code=None, country="USA")
    assert doc1.eq(doc2, nones_ok=True)
