from enum import StrEnum


class StringEnum(StrEnum):
    """
    A StringEnum is a StrEnum that can be compared to a string.
    """

    def __eq__(self, other: str | object) -> bool:
        """
        Compare the StringEnum to the __str__ of an object."""
        try:
            return super().__eq__(other)
        except:
            if str(self.value) == str(other):
                return True
            raise
