import pytest

from qai.schema import Address


def test_format_address_complete():
    address = Address(
        street="123 Main St",
        street2="Apt 4B",
        city="Anytown",
        state="CA",
        postal_code="12345",
        country="USA",
        notes="Home address",
        current=True,
    )

    expected = "Apt 4B\n123 Main St\n12345 Anytown\nCA\nUSA"

    result = Address.format_address(address, one_line=False)
    assert result == expected


def test_format_address_minimal():
    address = Address(
        street="123 Main St",
        city="Anytown",
    )

    expected = "123 Main St\n" "Anytown"

    result = Address.format_address(address, one_line=False)
    assert result == expected


def test_format_address_raw():
    address = Address(raw="123 Main St, Anytown, CA 12345")

    result = Address.format_address(address)
    assert result == "123 Main St, Anytown, CA 12345"


def test_format_address_one_line():
    address = Address(
        street="123 Main St",
        city="Anytown",
        state="CA",
        postal_code="12345",
        country="USA",
        notes="Home address",
        current=True,
    )

    expected = "123 Main St, 12345 Anytown, CA, USA"

    result = Address.format_address(address, one_line=True)
    assert result == expected


def test_format_address_international():
    address = Address(
        street="10 Downing Street",
        city="London",
        postal_code="SW1A 2AA",
        country="United Kingdom",
    )

    expected = "10 Downing Street\nSW1A 2AA London\nUnited Kingdom"

    result = Address.format_address(address, one_line=False)
    assert result == expected


def test_format_address_empty():
    address = Address()

    result = Address.format_address(address, one_line=False)
    assert result == ""


def test_city_state():
    address = Address(city="Salem", state="CA", country="USA")

    result = Address.format_address(address, one_line=True)
    assert result == "Salem, CA, USA"


if __name__ == "__main__":
    pytest.main([__file__])
