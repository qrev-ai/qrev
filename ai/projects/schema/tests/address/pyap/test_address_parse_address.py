""" Pyap doesn't support addresses from all countries, 
and seems limited in its parsing capabilities. But it's still better than nothing.
"""

import pytest
from pyap.exceptions import CountryDetectionMissing

from qai.schema.models.address_model import Address, _load_address_parser
from qai.schema.parsers.address_parser_pyap import parse_address

# def parse_address(address, country="US"):
#     parsed_addresses = pyap.parse(address, country=country)
#     if not parsed_addresses:
#         raise ValueError(f"Unable to parse address: {address}")
#     return parsed_addresses[0].data_as_dict  # type: ignore


def assert_address_parts(actual, expected):
    for key, value in expected.items():
        assert actual[key] == value, f"Mismatch in {key}: expected {value}, got {actual.get(key)}"


class TestPyAP:

    def test_us_address(
        self,
    ):
        """
        Test parsing a US address, It doesn't correctly parse
        """
        with pytest.raises(ValueError):

            address = "1600 Pennsylvania Ave NW, Washington, DC 20500"
            a = parse_address(address)
            expected = {
                "street_number": "1600",
                "street_name": "Pennsylvania",
                "street_type": "Ave",
                "post_direction": "NW",
                "city": "Washington",
                "region1": "DC",
                "postal_code": "20500",
                "country_id": "US",
            }
            assert_address_parts(a, expected)

    def test_us_address_long_country(
        self,
    ):
        """
        Test parsing a US address, It doesn't correctly parse
        """
        # with pytest.raises(ValueError):

        address = "Berkeley, California, United States"
        a = parse_address(address)
        d = a.model_dump(exclude_none=True)
        expected = {
            "city": "Berkeley",
            "state": "California",
            "country": "US",
            "raw": "Berkeley, California, United States",
        }
        assert_address_parts(d, expected)

    def test_us_address_city(
        self,
    ):
        address = "Washington DC"
        a = parse_address(address)
        d = a.model_dump(exclude_none=True)
        expected = {"city": "Washington", "state": "DC", "country": "US", "raw": "Washington DC"}
        assert_address_parts(d, expected)

    def test_us_address_city_state(
        self,
    ):
        address = "Stillwater, Oklahoma"
        a = parse_address(address)
        d = a.model_dump(exclude_none=True)
        expected = {
            "city": "Stillwater",
            "state": "Oklahoma",
            "country": "US",
            "raw": "Stillwater, Oklahoma",
        }
        assert_address_parts(d, expected)

    def test_uk_address(
        self,
    ):
        address = "10 Downing Street, London, SW1A 2AA, United Kingdom"
        a = parse_address(address, country="GB")
        expected = {
            "street": "10 Downing Street",
            "city": "London",
            "postal_code": "SW1A 2AA",
            "country": "GB",
            "raw": "10 Downing Street, London, SW1A 2AA, United Kingdom",
        }
        d = a.model_dump(exclude_none=True)
        assert_address_parts(d, expected)

    def test_fr_address(
        self,
    ):
        """
        pyap doesn't support French addresses
        """
        with pytest.raises(ValueError):
            address = "Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France"
            a = parse_address(address)

    def test_au_address(
        self,
    ):
        """
        pyap doesn't support Australian addresses
        """
        with pytest.raises(CountryDetectionMissing):
            address = "1 Macquarie Street, Sydney, NSW 2000, Australia"
            a = parse_address(address, country="AU")

    def test_in_address(
        self,
    ):
        """
        pyap doesn't support Indian addresses
        """
        with pytest.raises(CountryDetectionMissing):
            address = "Mahatma Gandhi Road, Mumbai, Maharashtra 400001, India"
            a = parse_address(address, country="IN")

    def test_address_from_str_with_country(self):
        pa = _load_address_parser("qai.schema.parsers.address_parser_pyap")
        assert pa
        Address.parse_address = pa

        address = "10 Downing Street, London, SW1A 2AA, United Kingdom"
        a = Address.from_str(s=address, country="GB")
        assert a.street == "10 Downing Street"
        assert a.city == "London"
        assert a.postal_code == "SW1A 2AA"
        assert a.country == "GB"
        assert a.state is None
        assert a.street2 is None


if __name__ == "__main__":
    pytest.main([__file__])
