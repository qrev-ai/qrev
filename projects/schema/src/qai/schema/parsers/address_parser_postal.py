from functools import partial
from typing import Any, Type, cast

from postal.parser import parse_address as postal_parse_address  # type: ignore

from qai.schema.extensions import ET
from qai.schema.models.address_model import Address as Address
import pycountry

def parse_address(s: str, *args, **kwargs) -> Address:
    """
    Transform an address string into a structured address object.
    Args:
        s: The address string to parse.
    Returns:
        An Address object.

    Fields inside parsed address:
    "house_number"
    "street"
    "street2"
    "city"
    "state"
    "postal_code"
    "country"

    """
    country_str = kwargs.get("country", None)
    if country_str:
        country = pycountry.countries.search_fuzzy(country_str)
        if country:
            kwargs["country"] = country[0].alpha_2 # type: ignore
    
    if "country" in kwargs:
        ## TODO, currently postal has some error where country="str" doesn't work
        ## So we need to pass the country as part of the string, if it's not in the string
        if not s.endswith(kwargs["country"]):
            s = f"{s}, {kwargs['country']}"
        kwargs.pop("country")

    parsed_address = postal_parse_address(s, **kwargs)

    address_dict: dict[str, Any] = {
        "current": False,
    }
    street_parts = []
    for component, label in parsed_address:
        if label in ("house_number", "road"):
            street_parts.append(component)
        elif label in ("city", "suburb"):
            address_dict["city"] = component
        elif label == "state":
            address_dict["state"] = component
        elif label == "postcode":
            address_dict["postal_code"] = component
        elif label == "country":
            address_dict["country"] = component
    if street_parts is not None:
        address_dict["street"] = " ".join(street_parts)
    ## Remove empy strings
    address_dict = {k: v for k, v in address_dict.items() if v}
    return Address(**address_dict)
