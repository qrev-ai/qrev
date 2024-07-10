import pytest
from postal.expand import expand_address


def test_us_address():
    address = "1600 Pennsylvania Ave NW, Washington, DC 20500"
    a = expand_address(address)
    expected = [
        "1600 pennsylvania avenue northwest washington district of columbia 20500",
        "1600 pennsylvania avenue northwest washington dc 20500",
        "1600 pennsylvania avenue nw washington district of columbia 20500",
        "1600 pennsylvania avenue nw washington dc 20500",
    ]
    assert sorted(a) == sorted(expected)


def test_uk_address():
    address = "10 Downing Street, London, SW1A 2AA, United Kingdom"
    a = expand_address(address)
    expected = [
        "10 downing street london sw1a 2aa united kingdom",
        "10 downing street london sw1a 2 aa united kingdom",
        "10 downing street london southwest 1a 2aa united kingdom",
        "10 downing street london sw 1a 2aa united kingdom",
        "10 downing street london southwest 1a 2 aa united kingdom",
        "10 downing street london sw 1a 2 aa united kingdom",
    ]
    assert sorted(a) == sorted(expected)


def test_fr_address():
    address = "Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France"
    a = expand_address(address)
    expected = ["eiffel tower champ de marches 5 avenue anatole france 75007 paris france"]
    assert sorted(a) == sorted(expected)


def test_au_address():
    address = "1 Macquarie Street, Sydney, NSW 2000, Australia"
    a = expand_address(address)
    expected = [
        "1 macquarie street sydney nsw 2000 australia",
        "1 macquarie street sydney new south wales 2000 australia",
    ]
    assert sorted(a) == sorted(expected)


def test_in_address():
    address = "Mahatma Gandhi Road, Mumbai, Maharashtra 400001, India"
    a = expand_address(address)
    expected = ["mahatma gandhi road mumbai maharashtra 400001 india"]
    assert sorted(a) == sorted(expected)


if __name__ == "__main__":
    pytest.main([__file__])
