from typing import Generic, TypeVar

from pydantic import BaseModel

from .merge import Priority, merge_value

T = TypeVar("T")

# SourcePriority is now just an alias for int


def merge_companies(
    target: BaseModel, source: BaseModel, target_priority: Priority, source_priority: Priority
) -> None:
    for field_name, field in target.model_fields.items():
        if hasattr(source, field_name):
            target_value = getattr(target, field_name)
            source_value = getattr(source, field_name)

            if target_value is not None or source_value is not None:
                merged_value = merge_value(
                    target_value, source_value, target_priority, source_priority
                )
                setattr(target, field_name, merged_value)
