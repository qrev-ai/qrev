""" Pyap doesn't support addresses from all countries, 
and seems limited in its parsing capabilities. But it's still better than nothing.
"""

import re
from typing import Any, TypeVar, cast

import pyap

from qai.schema.models.address_model import Address

ET = TypeVar("ET", bound="Address")
country_map = {"United States": "US", "Great Britain": "GB", "United Kingdom": "GB", "Canada": "CA"}


def parse_address(s: str, country: str = "US", *args, **kwargs) -> Address:
    # Regex pattern to match country at the end of the string
    original_s = s
    pattern = r",\s*({})\s*$".format("|".join(country_map.keys()))

    match = re.search(pattern, s, re.IGNORECASE)

    if match:
        country = match.group(1)
        country = country_map[country.title()]
        s = re.sub(pattern, "", s, flags=re.IGNORECASE).strip()

    # Parse the address using pyap
    fake_street = ""
    parsed_addresses = pyap.parse(s, country=country)

    if not parsed_addresses:
        ## Try adding a fake street number to the address
        fake_street = "123 Fake St, "
        s = f"{fake_street}{s}"
        parsed_addresses = pyap.parse(s, country=country)

    if not parsed_addresses:
        raise ValueError(f"Unable to parse the address {s}, country={country}")

    # Take the first parsed address (assuming there's only one)
    parsed_address: Any = parsed_addresses[0]

    # Get the parsed address as a dictionary
    address_dict = cast(dict[str, Any], parsed_address.data_as_dict)

    if fake_street:
        # Remove the fake street number
        address_dict.pop("full_street", None)
        address_dict.pop("street_name", None)
        address_dict.pop("street_type", None)
        address_dict.pop("street_number", None)
        address_dict.pop("post_direction", None)
        address_dict["full_address"] = address_dict.get("full_address", "").replace(fake_street, "", 1)
        

    # Map the parsed fields to our Address class
    address = Address(
        street=address_dict.get("full_street"),
        city=address_dict.get("city"),
        state=address_dict.get("region1"),  # pyap uses 'region1' for state
        postal_code=address_dict.get("postal_code"),
        country=address_dict.get("country_id"),
        raw=original_s,
    )
    return address
