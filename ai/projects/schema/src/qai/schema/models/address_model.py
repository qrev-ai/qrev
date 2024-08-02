import importlib
import re
from logging import getLogger
from typing import Callable, Optional, TypeVar, cast

from addressformatting import AddressFormatter  # type: ignore
from pydantic import Field, field_validator

from qai.schema.extensions import ExtendedDocument
from qai.schema.models.addons import Provenance

log = getLogger(__name__)

T = TypeVar("T", bound="Address")


class Address(ExtendedDocument):
    street: Optional[str] = Field(default=None, description="The street address")
    street2: Optional[str] = Field(default=None, description="The street address")
    city: Optional[str] = Field(default=None, description="The city")
    state: Optional[str] = Field(default=None, description="The state")
    postal_code: Optional[str] = Field(default=None, description="The postal code")
    country: Optional[str] = Field(default=None, description="The country")
    current: Optional[bool] = Field(
        default=None, description="Whether the address is the current one"
    )
    notes: Optional[str] = Field(default=None, description="The address notes")
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the address"
    )
    raw: Optional[str] = Field(default=None, description="The raw address, to be parsed")

    def equality_hash(self):
        ## make a tuple of all equality_fields
        all_kv = self.model_fields.items()
        return tuple([getattr(self, k) for k, v in all_kv if k in self.Settings.equality_fields])

    @field_validator("street", "street2", "city", "state", "postal_code", "country", "notes", "raw")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v

    @classmethod
    def from_str(cls: type[T], s: str, *args, **kwargs) -> T:
        return cls.parse_address(s=s, *args, **kwargs)  # type: ignore

    @classmethod
    def parse_address(cls: type["T"], s: str, *args, **kwargs) -> T:
        if not hasattr(cls, "_parse_address"):
            setattr(cls, "_parse_address", _load_address_parsers())
            assert cls._parse_address, "No address parser loaded" #type: ignore
        try:
            return cls._parse_address(s=s, *args, **kwargs)  # type: ignore
        except:
            return cast(T, Address(raw=s))

    class Settings:
        equality_fields = ["street", "street2", "city", "state", "postal_code", "country"]

    def __str__(self) -> str:
        return self.format_address(self)

    @classmethod
    def format_address(cls, address: "Address", one_line: bool = False) -> str:
        address_dict = {
            "road": address.street,
            "house": address.street2,
            "city": address.city,
            "state": address.state,
            "postcode": address.postal_code,
            "country": address.country,
        }

        # Remove None values
        data_dict = {k: v for k, v in address_dict.items() if v is not None}
        formatter = AddressFormatter()
        # Format the address using address-formatting
        if one_line:
            formatted_address = formatter.one_line(data_dict, country=address.country)  # type: ignore
        else:
            formatted_address = formatter.format(data_dict, country=address.country)  # type: ignore
        # Ensure state is included if it's in the original address
        if address.state and address.state not in formatted_address:
            if one_line:
                parts = formatted_address.split(", ")
                if len(parts) >= 2:
                    parts.insert(-1, address.state)
                formatted_address = ", ".join(parts)
            else:
                lines = formatted_address.split("\n")
                if len(lines) >= 2:
                    lines.insert(-1, address.state)
                formatted_address = "\n".join(lines)

        # Remove any whitespace before or after newlines, and strip the entire string
        formatted_address = re.sub(r"\s*\n\s*", "\n", formatted_address.strip())
        if not formatted_address:
            formatted_address = address.raw or ""
        return formatted_address.strip()


def _load_address_parser(module_path: str) -> Optional[Callable]:
    try:
        module = importlib.import_module(module_path)
        parse_address = getattr(module, "parse_address")
        return parse_address
    except ImportError:
        log.debug(f"Failed to import {module_path} parser")
    except AttributeError:
        log.debug(f"{module_path} parser does not have parse_address function")
    return None


def _basic_parse_address(s: str, *args, **kwargs) -> Address:
    return Address(raw=s)


def _load_address_parsers() -> Callable:
    log.debug("Loading external Address parsers")

    parsers = [
        ("postal", "qai.schema.parsers.address_parser_postal"),
        ("pyap", "qai.schema.parsers.address_parser_pyap"),
    ]

    for parser_name, module_path in parsers:
        parse_address = _load_address_parser(module_path)
        if parse_address:
            log.debug(f"Loaded {parser_name} parser")
            return parse_address
    else:
        log.error("No Address parser could be loaded")
        return _basic_parse_address
