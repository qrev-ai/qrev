import pytest

from qai.schema.models.models import Address
from qai.schema.parsers.address_parser_postal import parse_address


def test_transform_us_address():
    ## TODO: DC is not technically a state, and instead is a territory.
    address = "1600 Pennsylvania Ave NW, Washington, DC 20500"
    expected = Address(
        street="1600 pennsylvania ave nw",
        city="washington",
        state="dc",
        postal_code="20500",
        country=None,
        current=None,
        notes=None,
    )
    result = parse_address(address)
    assert result.eq(expected, nones_ok=True)


def test_transform_us_address_city():
    address = "Stillwater, Oklahoma, United States"
    expected = Address(
        street=None,
        city="stillwater",
        state="oklahoma",
        postal_code=None,
        country="united states",
        current=False,
        notes=None,
    )
    result = parse_address(address)
    assert result.eq(expected, nones_ok=True)


def test_transform_uk_address():
    address = "10 Downing Street, London, SW1A 2AA, United Kingdom"
    expected = Address(
        street="10 downing street",
        city="london",
        state=None,
        postal_code="sw1a 2aa",
        country="united kingdom",
        current=False,
        notes=None,
    )
    result = parse_address(address)
    assert result.eq(expected, nones_ok=True)


def test_transform_fr_address():
    address = "5 Avenue Anatole, 75007 Paris, France"
    expected = Address(
        street="5 avenue anatole",
        city="paris",
        state=None,
        postal_code="75007",
        country="france",
        current=False,
        notes=None,
    )
    result = parse_address(address)
    assert result.eq(expected, nones_ok=True)


def test_transform_au_address():
    address = "1 Macquarie Street, Sydney, NSW 2000, Australia"
    expected = Address(
        street="1 macquarie street",
        city="sydney",
        state="nsw",
        postal_code="2000",
        country="australia",
        current=False,
        notes=None,
    )
    result = parse_address(address)
    assert result.eq(expected, nones_ok=True)


def test_transform_in_address():
    address = "Mahatma Gandhi Road, Mumbai, Maharashtra 400001, India"
    expected = Address(
        street="mahatma gandhi road",
        city="mumbai",
        state="maharashtra",
        postal_code="400001",
        country="india",
        current=False,
        notes=None,
    )
    result = parse_address(address)
    assert result.eq(expected, nones_ok=True)


if __name__ == "__main__":
    pytest.main([__file__, "-rP"])
