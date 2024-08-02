from typing import Any, Dict, List, Optional

import pytest
from pydantic import BaseModel, Field

from qai.schema.mergers.merge import (
    HIGH_PRIORITY,
    NORMAL_PRIORITY,
    Priority,
    SmartCombineDictsStrategy,
    SmartListAsSetMergeStrategy,
    SmartListMergeStrategy,
    SmartPreferTrustedStrategy,
    merge_model,
    merge_value,
)


# Test models
class SimpleModel(BaseModel):
    name: str
    age: int


class ComplexModel(BaseModel):
    simple: SimpleModel
    numbers: List[int]
    data: Dict[str, Any]


# Test SmartPreferTrustedStrategy
def test_smart_prefer_trusted_strategy():
    strategy = SmartPreferTrustedStrategy()

    # Test with simple values
    assert strategy.__merge__(1, 2, NORMAL_PRIORITY, HIGH_PRIORITY) == 2
    assert strategy.__merge__(1, 2, HIGH_PRIORITY, NORMAL_PRIORITY) == 1

    # Test with None values
    assert strategy.__merge__(None, 2, NORMAL_PRIORITY, HIGH_PRIORITY) == 2
    assert strategy.__merge__(1, None, HIGH_PRIORITY, NORMAL_PRIORITY) == 1

    # Test with lists (this actually uses SmartListAsSetMergeStrategy)
    assert set(strategy.__merge__([1, 2], [3, 4], NORMAL_PRIORITY, HIGH_PRIORITY)) == set(
        [1, 2, 3, 4]
    )

    # Test with dicts (this actually uses SmartCombineDictsStrategy)
    assert strategy.__merge__({"a": 1}, {"b": 2}, HIGH_PRIORITY, NORMAL_PRIORITY) == {
        "a": 1,
        "b": 2,
    }


# Test SmartListAsSetMergeStrategy
def test_smart_list_as_set_merge_strategy():
    strategy = SmartListAsSetMergeStrategy()

    # Test with simple values
    result = strategy.__merge__([1, 2, 3], [3, 4, 5], NORMAL_PRIORITY, HIGH_PRIORITY)
    assert set(result) == set([1, 2, 3, 4, 5])  # Use set for comparison to ignore order

    # Test with complex objects
    class MergeableObject:
        def __init__(self, value):
            self.value = value

        def equality_hash(self):
            return hash(self.value)

        def __merge__(self, other, p1, p2):
            return MergeableObject(max(self.value, other.value))

    obj1 = MergeableObject(1)
    obj2 = MergeableObject(2)
    obj3 = MergeableObject(1)  # Same value as obj1
    result = strategy.__merge__([obj1], [obj2, obj3], NORMAL_PRIORITY, HIGH_PRIORITY)
    assert len(result) == 2  # Only unique objects are kept
    assert set(obj.value for obj in result) == set([1, 2])


# Test SmartCombineDictsStrategy
def test_smart_combine_dicts_strategy():
    strategy = SmartCombineDictsStrategy()

    # Test with simple values
    result = strategy.__merge__({"a": 1, "b": 2}, {"b": 3, "c": 4}, NORMAL_PRIORITY, HIGH_PRIORITY)
    assert result == {"a": 1, "b": 3, "c": 4}

    # Test with nested dicts
    result = strategy.__merge__({"a": {"x": 1}}, {"a": {"y": 2}}, HIGH_PRIORITY, NORMAL_PRIORITY)
    assert result == {"a": {"x": 1, "y": 2}}


# Test merge_value function
def test_merge_value():
    # Test with simple values
    assert merge_value(1, 2, NORMAL_PRIORITY, HIGH_PRIORITY) == 2

    # Test with lists
    result = merge_value([1, 2], [3, 4], NORMAL_PRIORITY, HIGH_PRIORITY)
    assert set(result) == set([1, 2, 3, 4])  # Use set for comparison to ignore order

    # Test with dicts
    assert merge_value({"a": 1}, {"b": 2}, HIGH_PRIORITY, NORMAL_PRIORITY) == {"a": 1, "b": 2}


# Test merge_model function
def test_merge_model_simple():
    # Test with SimpleModel
    model1 = SimpleModel(name="Alice", age=30)
    model2 = SimpleModel(name="Bob", age=25)
    merge_model(model2, model1, HIGH_PRIORITY, NORMAL_PRIORITY)
    assert model1.name == "Bob"
    assert model1.age == 25


def test_merge_model_complex():
    # Test with ComplexModel
    complex1 = ComplexModel(
        simple=SimpleModel(name="Alice", age=30), numbers=[1, 2, 3], data={"a": 1, "b": 2}
    )
    complex2 = ComplexModel(
        simple=SimpleModel(name="Bob", age=25), numbers=[3, 4, 5], data={"b": 3, "c": 4}
    )
    merge_model(complex2, complex1, HIGH_PRIORITY, NORMAL_PRIORITY)
    assert complex1.simple.name == "Bob"
    assert complex1.simple.age == 25
    assert set(complex1.numbers) == set([1, 2, 3, 4, 5])  # Use set for comparison to ignore order
    assert complex1.data == {"a": 1, "b": 3, "c": 4}


# Test edge cases for empty lists
def test_empty_lists():
    strategy = SmartListMergeStrategy()
    assert strategy.__merge__([], [1, 2, 3], NORMAL_PRIORITY, HIGH_PRIORITY) == [1, 2, 3]
    assert strategy.__merge__([1, 2, 3], [], HIGH_PRIORITY, NORMAL_PRIORITY) == [1, 2, 3]
    assert strategy.__merge__([], [], NORMAL_PRIORITY, HIGH_PRIORITY) == []


# Test lists with mixed types
def test_mixed_type_lists():
    class ComplexObject:
        def __init__(self, value):
            self.value = value

    strategy = SmartListAsSetMergeStrategy()
    list1 = [1, "a", ComplexObject(1)]
    list2 = [2, "b", ComplexObject(2)]
    result = strategy.__merge__(list1, list2, NORMAL_PRIORITY, HIGH_PRIORITY)
    assert len(result) == 6  # All elements should be kept as they're unique


# Test nested lists
def test_nested_lists():
    strategy = SmartListMergeStrategy()
    list1 = [1, [2, 3], 4]
    list2 = [5, [6, 7], 8]
    result = strategy.__merge__(list1, list2, NORMAL_PRIORITY, HIGH_PRIORITY)
    assert result == [1, [2, 3], 4, 5, [6, 7], 8]


# Test large lists (this is more of a performance test)
def test_large_lists():
    strategy = SmartListAsSetMergeStrategy()
    large_list1 = list(range(10000))
    large_list2 = list(range(5000, 15000))
    result = strategy.__merge__(large_list1, large_list2, NORMAL_PRIORITY, HIGH_PRIORITY)
    assert len(result) == 15000


# Test lists with all duplicate elements
def test_all_duplicates():
    strategy = SmartListAsSetMergeStrategy()
    list1 = [1, 1, 1]
    list2 = [1, 1, 1]
    result = strategy.__merge__(list1, list2, NORMAL_PRIORITY, HIGH_PRIORITY)
    assert result == [1]


# Test priority edge cases
def test_priority_edge_cases():
    strategy = SmartListMergeStrategy()
    assert strategy.__merge__([1, 2], [3, 4], NORMAL_PRIORITY, NORMAL_PRIORITY) == [1, 2, 3, 4]
    assert strategy.__merge__([1, 2], [3, 4], 0, 100) == [1, 2, 3, 4]  # type: ignore


# Test complex objects without __merge__ or equality_hash
def test_complex_objects_without_special_methods():
    class SimpleObject:
        def __init__(self, value):
            self.value = value

    strategy = SmartListAsSetMergeStrategy()
    obj1, obj2, obj3 = SimpleObject(1), SimpleObject(2), SimpleObject(1)
    result = strategy.__merge__([obj1], [obj2, obj3], NORMAL_PRIORITY, HIGH_PRIORITY)
    assert len(result) == 3  # All objects should be kept as they're considered unique


# Test error handling
def test_error_handling():
    strategy = SmartListMergeStrategy()
    with pytest.raises(TypeError):
        strategy.__merge__("not a list", [1, 2, 3], NORMAL_PRIORITY, HIGH_PRIORITY)  # type: ignore
    with pytest.raises(TypeError):
        strategy.__merge__([1, 2, 3], "not a list", NORMAL_PRIORITY, HIGH_PRIORITY)  # type: ignore


if __name__ == "__main__":
    pytest.main([__file__])
