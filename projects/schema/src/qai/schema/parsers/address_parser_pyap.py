""" Pyap doesn't support addresses from all countries, 
and seems limited in its parsing capabilities. But it's still better than nothing.
"""

from typing import Any, TypeVar, cast

import pyap

from qai.schema.models.address_model import Address

ET = TypeVar('ET', bound='Address')

def parse_address(cls: type[ET], s: str, country: str = 'US') -> Address:
    # Parse the address using pyap
    parsed_addresses = pyap.parse(s, country="US")

    if not parsed_addresses:
        raise ValueError("Unable to parse the address")

    # Take the first parsed address (assuming there's only one)
    parsed_address: Any = parsed_addresses[0]

    # Get the parsed address as a dictionary
    address_dict = cast(dict[str, Any], parsed_address.data_as_dict)

    # Map the parsed fields to our Address class
    address = Address(
        street=address_dict.get("full_street"),
        city=address_dict.get("city"),
        state=address_dict.get("region1"),  # pyap uses 'region1' for state
        postal_code=address_dict.get("postal_code"),
        country=address_dict.get("country_id"),
        raw=address_dict.get("full_address"),
    )
    return address
