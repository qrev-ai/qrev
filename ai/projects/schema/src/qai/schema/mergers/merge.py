import logging
from typing import Any, Dict, Generic, Hashable, List, NewType, Optional, TypeVar, cast

from pydantic import BaseModel

T = TypeVar("T")

log = logging.getLogger(__name__)

Priority = NewType("Priority", int)


LOWER_PRIORITY = Priority(30)
LOW_PRIORITY = Priority(40)
NORMAL_PRIORITY = Priority(50)
HIGH_PRIORITY = Priority(60)
HIGHER_PRIORITY = Priority(70)


class MergeStrategy(Generic[T]):
    def __merge__(self, value1: T, value2: T, priority1: Priority, priority2: Priority) -> T:
        raise NotImplementedError


class SmartPreferTrustedStrategy(MergeStrategy[T]):
    def __merge__(
        self, target_value: T, source_value: T, target_priority: Priority, source_priority: Priority
    ) -> T:
        # If either value is None, return the non-None value
        if target_value is None:
            return source_value
        if source_value is None:
            return target_value

        if source_priority > target_priority:
            preferred, other = source_value, target_value
            high_priority, low_priority = source_priority, target_priority
        else:
            preferred, other = target_value, source_value
            high_priority, low_priority = target_priority, source_priority

        if hasattr(preferred, "__merge__") and callable(getattr(preferred, "__merge__")):
            return preferred.__merge__(other, high_priority, low_priority)  # type: ignore
        elif isinstance(preferred, list) and isinstance(other, list):
            return SmartListAsSetMergeStrategy().__merge__(
                preferred, other, high_priority, low_priority
            )
        elif isinstance(preferred, dict) and isinstance(other, dict):
            return SmartCombineDictsStrategy().__merge__(
                preferred, other, high_priority, low_priority
            )
        else:
            return preferred


class SmartListMergeStrategy(MergeStrategy[List[Any]]):
    def __merge__(
        self, value1: List[Any], value2: List[Any], priority1: Priority, priority2: Priority
    ) -> List[Any]:
        merged = []
        seen_complex: Dict[int, Any] = {}

        for item in value1 + value2:
            if isinstance(item, (int, str, float, bool)):
                merged.append(item)
            else:
                if hasattr(item, "equality_hash") and callable(getattr(item, "equality_hash")):
                    item_hash = item.equality_hash()
                    if item_hash in seen_complex:
                        existing = seen_complex[item_hash]
                        if hasattr(existing, "__merge__") and callable(
                            getattr(existing, "__merge__")
                        ):
                            merged[merged.index(existing)] = existing.__merge__(
                                item, priority1, priority2
                            )
                    else:
                        merged.append(item)
                        seen_complex[item_hash] = item
                elif hasattr(item, "__merge__") and callable(getattr(item, "__merge__")):
                    existing = next((x for x in merged if type(x) == type(item)), None)
                    if existing:
                        merged[merged.index(existing)] = existing.__merge__(
                            item, priority1, priority2
                        )
                    else:
                        merged.append(item)
                else:
                    merged.append(item)

        return merged


class SmartListAsSetMergeStrategy(MergeStrategy[List[Any]]):
    def __merge__(
        self,
        target_value: List[Any],
        source_value: List[Any],
        target_priority: Priority,
        source_priority: Priority,
    ) -> List[Any]:
        merged = []
        seen_complex = {}

        def add_item(item, priority):
            if isinstance(item, (int, str, float, bool)):
                if item not in merged:
                    merged.append(item)
            elif hasattr(item, "equality_hash") and callable(getattr(item, "equality_hash")):
                item_hash = item.equality_hash()
                if item_hash in seen_complex:
                    existing, existing_priority = seen_complex[item_hash]
                    if hasattr(existing, "__merge__") and callable(getattr(existing, "__merge__")):
                        merged_item = existing.__merge__(item, existing_priority, priority)
                        merged[merged.index(existing)] = merged_item
                        seen_complex[item_hash] = (merged_item, max(existing_priority, priority))
                else:
                    merged.append(item)
                    seen_complex[item_hash] = (item, priority)
            else:
                # For objects without equality_hash, we'll use their string representation as a hash
                item_str = str(item)
                if item_str not in seen_complex:
                    merged.append(item)
                    seen_complex[item_str] = (item, priority)

        for item in target_value:
            add_item(item, target_priority)

        for item in source_value:
            add_item(item, source_priority)

        return merged


class StringMergeStrategy(MergeStrategy[str]):
    def __merge__(self, value1: str, value2: str, priority1: Priority, priority2: Priority) -> str:
        print(f"Merging strings: '{value1}' and '{value2}'")  # Debug print
        if priority1 >= priority2:
            return value1
        else:
            return value2


class SmartCombineDictsStrategy(MergeStrategy[Dict[Any, Any]]):
    def __merge__(
        self,
        target_value: Dict[Any, Any],
        source_value: Dict[Any, Any],
        target_priority: Priority,
        source_priority: Priority,
    ) -> Dict[Any, Any]:
        log.debug(
            f"Merging dicts with priorities: target={target_priority}, source={source_priority}"
        )
        log.debug(f"Target dict: {target_value}")
        log.debug(f"Source dict: {source_value}")

        merged = {}
        all_keys = set(target_value.keys()) | set(source_value.keys())

        for key in all_keys:
            if key in target_value and key in source_value:
                log.debug(f"Merging key '{key}' present in both dicts")
                merged[key] = merge_value(
                    source_value=source_value[key],
                    target_value=target_value[key],
                    source_priority=source_priority,
                    target_priority=target_priority,
                )
            elif key in target_value:
                log.debug(f"Using target value for key '{key}'")
                merged[key] = target_value[key]
            else:
                log.debug(f"Using source value for key '{key}'")
                merged[key] = source_value[key]

        log.debug(f"Merged dict: {merged}")
        return merged


def get_default_strategy(field_type: type) -> MergeStrategy:
    if issubclass(field_type, list):
        return SmartListAsSetMergeStrategy()
    elif issubclass(field_type, dict):
        return SmartCombineDictsStrategy()
    else:
        return SmartPreferTrustedStrategy()


def merge_value(
    source_value: T,
    target_value: T,
    source_priority: Priority,
    target_priority: Priority,
    field_name: Optional[str] = None,
) -> T:
    log.debug(
        f"Merging values for field '{field_name}': target={target_value}, source={source_value}"
    )
    log.debug(f"Priorities: target={target_priority}, source={source_priority}")

    if target_value is None:
        log.debug("Target value is None, using source value")
        return source_value
    if source_value is None:
        log.debug("Source value is None, using target value")
        return target_value

    if isinstance(target_value, BaseModel) and isinstance(source_value, BaseModel):
        log.debug("Merging nested models")
        merged_model = target_value.model_copy()
        merge_model(
            source=source_value,
            target=merged_model,
            source_priority=source_priority,
            target_priority=target_priority,
        )
        return merged_model
    elif isinstance(target_value, dict) and isinstance(source_value, dict):
        log.debug("Merging dictionaries")
        return SmartCombineDictsStrategy().__merge__(
            target_value=target_value,
            source_value=source_value,
            target_priority=target_priority,
            source_priority=source_priority,
        )
    elif isinstance(target_value, list) and isinstance(source_value, list):
        log.debug("Merging lists")
        return SmartListAsSetMergeStrategy().__merge__(
            target_value=target_value,
            source_value=source_value,
            target_priority=target_priority,
            source_priority=source_priority,
        )
    else:
        if source_priority > target_priority:
            log.debug("Source priority higher, using source value")
            return source_value
        else:
            log.debug("Target priority higher or equal, using target value")
            return target_value


def merge_model(
    source: BaseModel, target: BaseModel, source_priority: Priority, target_priority: Priority
) -> None:
    for field_name in target.model_fields:
        if hasattr(source, field_name):
            target_value = getattr(target, field_name)
            source_value = getattr(source, field_name)

            if target_value is not None or source_value is not None:
                merged_value = merge_value(
                    target_value=target_value,
                    source_value=source_value,
                    target_priority=target_priority,
                    source_priority=source_priority,
                    field_name=field_name,
                )
                setattr(target, field_name, merged_value)
