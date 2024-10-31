import re
from typing import List, Optional

import phonenumbers


def standardize_phone_number(number: str) -> str:
    # Standardize the phone number to (123)-456-7890 format
    digits = re.sub(r"\D", "", number)  # Remove non-digit characters
    if len(digits) == 10:
        return f"({digits[:3]})-{digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits.startswith("1"):  # Check for leading '1'
        return f"({digits[1:4]})-{digits[4:7]}-{digits[7:]}"
    return number  # Return original if formatting fails


def find_phone_numbers(text: str, region: str = "US") -> Optional[List[str]]:
    phone_numbers = []

    # Try matching with PhoneNumberMatcher for multiple phone numbers in text
    for match in phonenumbers.PhoneNumberMatcher(text, region):
        formatted_number = phonenumbers.format_number(
            match.number, phonenumbers.PhoneNumberFormat.E164
        )
        standardized_number = standardize_phone_number(formatted_number)
        phone_numbers.append(standardized_number)

    # If no matches were found, attempt a parse fallback for individual phone numbers
    if not phone_numbers:
        # Define multiple regex patterns for different formats
        patterns = [
            r"\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}",  # (123) 456-7890, 123-456-7890, +1 123-456-7890
            r"\+?1?\s?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}",  # 1234567890, +11234567890
            r"\+?1?\s?\(?\d{3}\)?\s?\d{3}[\s.-]?\d{4}",  # (123)4567890
        ]

        # Compile patterns
        compiled_patterns = [re.compile(pattern) for pattern in patterns]

        # Find all matches
        for pattern in compiled_patterns:
            matches = pattern.findall(text)
            matches = [match.strip() for match in matches]
            phone_numbers.extend(matches)

        # Clean up matches to a consistent format
        phone_numbers = list(set(phone_numbers))  # Remove duplicates if any
        # Standardize the found numbers
        phone_numbers = [standardize_phone_number(num) for num in phone_numbers]

        return phone_numbers if phone_numbers else None

    return phone_numbers if phone_numbers else None
