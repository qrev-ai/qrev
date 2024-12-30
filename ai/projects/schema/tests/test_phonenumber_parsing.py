from enum import StrEnum
from typing import ClassVar, List, Optional, Type

import phonenumbers
import pytest

from qai.schema import PhoneNumber, PhoneType
from qai.schema.utils.phone_utils import find_phone_numbers


class TestPhoneNumberFromStr:
    """Tests for PhoneNumber.from_str method"""

    def test_basic_us_number(self):
        """Test basic US phone number formats"""
        phone = PhoneNumber.from_str("404-885-3212", type=PhoneType.WORK)
        assert phone.number == "+14048853212"
        assert phone.type == PhoneType.WORK
        assert phone.notes
        assert "Original format: 404-885-3212" in phone.notes

    def test_us_number_with_country_code(self):
        """Test US numbers with country code in different formats"""
        test_cases = [
            ("+1-212-123-4567", "+12121234567"),
            ("+1.212.123.4567", "+12121234567"),
            ("+1 212 123 4567", "+12121234567"),
        ]
        for input_str, expected in test_cases:
            phone = PhoneNumber.from_str(input_str)
            assert phone.number == expected and phone.notes
            assert f"Original format: {input_str}" in phone.notes

    def test_us_number_with_parentheses(self):
        """Test US numbers with parentheses format"""
        test_cases = [
            ("(404) 885-2610", "+14048852610"),
            ("1 (212) 123-4567", "+12121234567"),
        ]
        for input_str, expected in test_cases:
            phone = PhoneNumber.from_str(input_str)
            assert phone.number == expected

    def test_phone_types(self):
        """Test different phone types"""
        test_cases = [
            (PhoneType.WORK, "Work number"),
            (PhoneType.MOBILE, "Mobile number"),
            (PhoneType.FAX, "Fax number"),
            (PhoneType.HOME, "Home number"),
            (PhoneType.OTHER, "Other number"),
        ]

        for phone_type, _ in test_cases:
            phone = PhoneNumber.from_str("404-885-3212", type=phone_type)
            assert phone.type == phone_type

    def test_international_numbers(self):
        """Test international phone numbers"""
        test_cases = [
            ("020 7183 8750", "GB", "+442071838750"),
            ("(02) 9876 5432", "AU", "+61298765432"),
            ("+44 20 7123 4567", None, "+442071234567"),
            ("01 23 45 67 89", "FR", "+33123456789"),
        ]

        for input_str, region, expected in test_cases:
            kwargs = {"region": region} if region else {}
            phone = PhoneNumber.from_str(input_str, **kwargs)
            assert phone.number == expected

    def test_invalid_numbers(self):
        """Test invalid phone numbers"""
        invalid_cases = [
            "",  # Empty string
            "123",  # Too short
            "not a number",  # Invalid format
            "+1234567890123456",  # Too long
        ]

        for invalid in invalid_cases:
            with pytest.raises(ValueError):
                PhoneNumber.from_str(invalid)


class TestParsePhoneNumbers:
    """Tests for PhoneNumber.parse_phone_numbers function"""

    def test_single_number(self):
        """Test parsing a single phone number"""
        phone_objects = PhoneNumber.parse_phone_numbers("+1-949-622-2700")
        assert len(phone_objects) == 1
        assert phone_objects[0].number == "+19496222700"
        assert phone_objects[0].type == PhoneType.WORK

    def test_multiple_numbers(self):
        """Test parsing multiple phone numbers"""
        numbers = "+1-949-622-2700, 1 (678) 721-7200, 404.885.3212"
        phone_objects = PhoneNumber.parse_phone_numbers(numbers)

        assert len(phone_objects) == 3
        assert phone_objects[0].number == "+19496222700"
        assert phone_objects[1].number == "+16787217200"
        assert phone_objects[2].number == "+14048853212"
        assert all(p.type == PhoneType.WORK for p in phone_objects)

    def test_mixed_valid_invalid(self):
        """Test parsing a mix of valid and invalid numbers"""
        numbers = "404-885-3212, invalid, +1-949-622-2700"
        phone_objects = PhoneNumber.parse_phone_numbers(numbers)

        assert len(phone_objects) == 2
        assert phone_objects[0].number == "+14048853212"
        assert phone_objects[1].number == "+19496222700"

    def test_empty_input(self):
        """Test parsing empty input"""
        assert PhoneNumber.parse_phone_numbers("") == []
        assert PhoneNumber.parse_phone_numbers(None) == []  # type: ignore


def test_find_phone_numbers_valid_formats():
    text = "Call me at (123) 456-7890 or 123-456-7890."
    result = find_phone_numbers(text)
    assert result == ["(123)-456-7890", "(123)-456-7890"]


def test_find_phone_numbers_with_country_code():
    text = "My number is +1 (123) 456-7890."
    result = find_phone_numbers(text)
    assert result == ["(123)-456-7890"]


def test_find_phone_numbers_different_separators():
    text = "Reach out at 123.456.7890 or 1234567890."
    result = find_phone_numbers(text)
    assert result == ["(123)-456-7890", "(123)-456-7890"]


def test_find_phone_numbers_no_match():
    text = "There are no phone numbers here."
    result = find_phone_numbers(text)
    assert result is None


def test_find_phone_numbers_mixed_text():
    text = "You can call us at (123) 456-7890 or email us at info@example.com."
    result = find_phone_numbers(text)
    assert result == ["(123)-456-7890"]


def test_find_phone_numbers_no_match_with_only_numbers():
    text = "There are numbers like 123456789 and 987654321 but these are not phone numbers."
    result = find_phone_numbers(text)
    assert result is None


def test_find_phone_numbers_partial_numbers():
    text = "I have the following: 12345, 67890, and 1234."
    result = find_phone_numbers(text)
    assert result is None


if __name__ == "__main__":
    pytest.main([__file__])
