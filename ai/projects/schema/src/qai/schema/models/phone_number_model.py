from enum import StrEnum
from typing import Optional, Type

import phonenumbers
from pydantic import Field

from qai.schema.models.addons import CreatedAtDoc, Provenance


class PhoneType(StrEnum):
    UNKNOWN = "unknown"
    OTHER = "other"
    MOBILE = "mobile"
    HOME = "home"
    WORK = "work"
    TOLL_FREE = "toll_free"
    FAX = "fax"


class PhoneNumber(CreatedAtDoc):
    number: str = Field(..., description="The phone number")
    type: PhoneType = Field(default=PhoneType.OTHER, description="The phone type")
    notes: Optional[str] = Field(default=None, description="The phone number notes")
    provenance: Optional[Provenance] = Field(
        default=None, description="The provenance of the PhoneNumber"
    )

    class Settings:
        equality_fields = ["number"]

    @classmethod
    def from_str(cls: Type["PhoneNumber"], s: str, *args, **kwargs) -> "PhoneNumber":
        """
        Create a PhoneNumber instance from a string.

        Args:
            s: String containing a phone number
            *args: Additional positional arguments
            **kwargs: Additional keyword arguments, supported:
                - type: PhoneType - the type of phone number (default: OTHER)
                - region: str - the default region for parsing (default: "US")

        Returns:
            PhoneNumber instance with parsed and formatted number
        """
        if not s or not s.strip():
            raise ValueError("Empty phone number string")

        # Get phone type from kwargs or default to OTHER
        phone_type = kwargs.get("type", PhoneType.OTHER)
        region = kwargs.get("region", "US")

        # Store original for notes
        original = s.strip()

        # Basic length validation before parsing
        # Most international numbers are between 8 and 16 digits
        digits_only = "".join(c for c in original if c.isdigit())
        if len(digits_only) > 16:
            raise ValueError(f"Phone number too long: {s}")
        if len(digits_only) < 4:
            raise ValueError(f"Phone number too short: {s}")

        try:
            # Parse the number
            parsed = phonenumbers.parse(original)

            if not phonenumbers.is_possible_number(parsed):
                raise ValueError(f"Invalid phone number '{s}' parsed as '{parsed}'")
            # Format in E164 format
            formatted_number = phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )

            # Create and return PhoneNumber instance
            return cls(
                number=formatted_number, type=phone_type, notes=f"Original format: {original}"
            )

        except phonenumbers.phonenumberutil.NumberParseException as e:
            # If parsing fails with the cleaned number, try with the raw number
            try:
                parsed = phonenumbers.parse(s.strip(), region)
                formatted_number = phonenumbers.format_number(
                    parsed, phonenumbers.PhoneNumberFormat.E164
                )
                return cls(
                    number=formatted_number, type=phone_type, notes=f"Original format: {original}"
                )
            except phonenumbers.phonenumberutil.NumberParseException:
                raise ValueError(f"Could not parse phone number '{s}'")

    @staticmethod
    def parse_phone_numbers(phone_string: str) -> list["PhoneNumber"]:
        """
        Parse a comma-separated string of phone numbers into PhoneNumber objects.

        Args:
            phone_string: String containing comma-separated phone numbers

        Returns:
            List of PhoneNumber objects with validated and formatted numbers
        """
        if not phone_string:
            return []

        # Split and clean phone numbers
        raw_numbers = [number.strip() for number in phone_string.split(",") if number.strip()]

        phone_numbers = []
        for raw_number in raw_numbers:
            try:
                # Use the new from_str class method
                phone_number = PhoneNumber.from_str(
                    raw_number, type=PhoneType.WORK  # Assuming company phones are work phones
                )
                phone_numbers.append(phone_number)
            except ValueError:
                # Log error or handle invalid numbers as needed
                continue

        return phone_numbers
