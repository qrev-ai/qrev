from enum import Enum
from typing import Any, Literal, Optional, Self, Type, Union

from pydantic import ConfigDict, Field, model_serializer
from pydantic.main import IncEx

from qai.schema.models.addons import Provenance


class SourceType(str, Enum):
    FOLDER = "folder"
    FILE = "file"
    TEXT = "text"
    URL = "url"

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, str):
            return self.value.lower() == other.lower()
        return super().__eq__(other)

    def __hash__(self) -> int:
        return hash(self.value.lower())

    @classmethod
    def _missing_(cls, value: object) -> "SourceType":
        """Handle case-insensitive lookup of enum values."""
        for member in cls:
            if member.value.lower() == value.lower():  # type: ignore
                return member
        raise ValueError(f"{cls.__name__} has no member {value!r}")

    def __str__(self) -> str:
        return self.value


class DataSource(Provenance):
    """Base class for all data sources"""

    type: SourceType
    description: Optional[str] = Field(default=None)
    model_config = ConfigDict(from_attributes=True, extra="allow")  # Allow extra fields

    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        # Get all fields from the current instance's class
        result = {}

        # Add Provenance fields
        for field_name in Provenance.model_fields:
            value = getattr(self, field_name, None)
            if value is not None:
                result[field_name] = value

        # Add DataSource fields
        for field_name in self.__class__.model_fields:
            value = getattr(self, field_name)
            if value is not None:
                if isinstance(value, SourceType):
                    result[field_name] = value.value  # Convert enum to string
                else:
                    result[field_name] = value

        return result

    @classmethod
    def model_validate(
        cls,
        obj: Any,
        *,
        strict: bool | None = None,
        from_attributes: bool | None = None,
        context: Any | None = None,
    ) -> Union["DataFolder", "DataFile", "DataText", "DataURL"]:
        """Factory method to create the appropriate DataSource subclass based on type"""
        if not isinstance(obj, dict):
            raise ValueError("Input must be a dictionary")

        # If we're already in a subclass, use standard Pydantic validation
        if cls != DataSource:
            return super().model_validate(  # type: ignore
                obj, strict=strict, from_attributes=from_attributes, context=context
            )

        type_map: dict[str, Type[DataSource]] = {
            SourceType.FOLDER: DataFolder,
            SourceType.FILE: DataFile,
            SourceType.TEXT: DataText,
            SourceType.URL: DataURL,
        }

        # Get the type from the input dictionary
        source_type = obj.get("type")
        if not source_type:
            raise ValueError("'type' field is required")

        # Convert string to SourceType enum if necessary
        if isinstance(source_type, str):
            try:
                source_type = SourceType(source_type)
            except ValueError:
                raise ValueError(f"Invalid source type: {source_type}")

        # Find the appropriate class
        source_class = type_map.get(source_type)
        if not source_class:
            raise ValueError(f"Invalid source type: {source_type}")

        # Use standard Pydantic validation for the specific subclass
        return source_class.model_validate(
            obj, strict=strict, from_attributes=from_attributes, context=context
        )


class DataFolder(DataSource):
    """Data source for folder paths"""

    type: SourceType = SourceType.FOLDER
    path: str
    recursive: bool = Field(default=False)
    file_pattern: Optional[str] = Field(default=None)

    @classmethod
    def model_validate(
        cls,
        obj: Any,
        *,
        strict: bool | None = None,
        from_attributes: bool | None = None,
        context: Any | None = None,
    ) -> Self:
        return super().model_validate(  # type: ignore
            obj, strict=strict, from_attributes=from_attributes, context=context
        )


class DataFile(DataSource):
    """Data source for individual files"""

    type: SourceType = SourceType.FILE
    path: str
    encoding: str = Field(default="utf-8")

    @classmethod
    def model_validate(
        cls,
        obj: Any,
        *,
        strict: bool | None = None,
        from_attributes: bool | None = None,
        context: Any | None = None,
    ) -> Self:
        return super().model_validate(  # type: ignore
            obj, strict=strict, from_attributes=from_attributes, context=context
        )


class DataText(DataSource):
    """Data source for direct text input"""

    type: SourceType = SourceType.TEXT
    content: str

    @classmethod
    def model_validate(
        cls,
        obj: Any,
        *,
        strict: bool | None = None,
        from_attributes: bool | None = None,
        context: Any | None = None,
    ) -> Self:
        return super().model_validate(  # type: ignore
            obj, strict=strict, from_attributes=from_attributes, context=context
        )


class DataURL(DataSource):
    """Data source for URLs"""

    type: SourceType = SourceType.URL
    url: str
    headers: Optional[dict] = Field(default=None)

    @classmethod
    def model_validate(
        cls,
        obj: Any,
        *,
        strict: bool | None = None,
        from_attributes: bool | None = None,
        context: Any | None = None,
    ) -> Self:
        return super().model_validate(  # type: ignore
            obj, strict=strict, from_attributes=from_attributes, context=context
        )
