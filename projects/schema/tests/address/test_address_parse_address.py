import pytest
from postal.parser import parse_address


def test_us_address():
    address = "1600 Pennsylvania Ave NW, Washington, DC 20500"
    a = parse_address(address)
    expected = [
        ("1600", "house_number"),
        ("pennsylvania ave nw", "road"),
        ("washington", "city"),
        ("dc", "state"),
        ("20500", "postcode"),
    ]
    assert a == expected

def test_us_address_city():
    address = "Washington DC"
    a = parse_address(address)
    expected = [
        ("washington dc", "city"),
    ]
    assert a == expected

def test_us_address_city_state():
    address = "Stillwater, Oklahoma"
    a = parse_address(address)
    expected = [
        ("stillwater", "city"),
        ("oklahoma", "state"),
    ]
    assert a == expected

def test_uk_address():
    address = "10 Downing Street, London, SW1A 2AA, United Kingdom"
    a = parse_address(address)
    expected = [
        ("10", "house_number"),
        ("downing street", "road"),
        ("london", "city"),
        ("sw1a 2aa", "postcode"),
        ("united kingdom", "country"),
    ]
    assert a == expected


def test_fr_address():
    address = "Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France"
    a = parse_address(address)
    expected = [
        ("eiffel tower", "house"),
        ("champ de mars", "road"),
        ("5", "house_number"),
        ("avenue anatole france", "road"),
        ("75007", "postcode"),
        ("paris", "city"),
        ("france", "country"),
    ]
    assert a == expected


def test_au_address():
    address = "1 Macquarie Street, Sydney, NSW 2000, Australia"
    a = parse_address(address)
    expected = [
        ("1", "house_number"),
        ("macquarie street", "road"),
        ("sydney", "suburb"),
        ("nsw", "state"),
        ("2000", "postcode"),
        ("australia", "country"),
    ]
    assert a == expected


def test_in_address():
    address = "Mahatma Gandhi Road, Mumbai, Maharashtra 400001, India"
    a = parse_address(address)
    expected = [
        ("mahatma gandhi road", "road"),
        ("mumbai", "city"),
        ("maharashtra", "state"),
        ("400001", "postcode"),
        ("india", "country"),
    ]
    assert a == expected


if __name__ == "__main__":
    pytest.main([__file__])
