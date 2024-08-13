import ctypes
import multiprocessing
import pytest
from unittest.mock import patch

from qai.agent.utils.distribute import adistribute, distribute
from qai.agent.utils import distribute as distribute_module
from logging import getLogger
import logging
logging.basicConfig(level=logging.DEBUG)
log = getLogger(__name__)
global_var_for_on_complete = multiprocessing.Value(ctypes.c_int, 0)  # (type, init value)
global_var_for_complete_with_fails = multiprocessing.Value(ctypes.c_bool, 0)  # (type, init value)


@pytest.fixture
def shared_int():
    return multiprocessing.Value(ctypes.c_int, 0)

def on_complete(shared_int, nsuccesses, nerrors):
    shared_int.value += 1
    log.debug(f"on_complete: nsuccesses={nsuccesses} nerrors={nerrors} global_var_for_on_complete={global_var_for_on_complete.value}")

def on_complete_with_fails(nsuccesses, nerrors):
    global_var_for_complete_with_fails.value = True

def mult(x, y):
    return x * y

def mult2(param):
    return param * 2

def error_on_even(x):
    if x % 2 == 0:
        raise ValueError(f"Error on {x}")
    return x

def test_empty_distribute():
    params_list = []  # Simple list of integers
    expected_results = []  # Expected results after processing

    actual_results = distribute(mult2, params_list)

    assert sorted(actual_results) == expected_results

def test_none_distribute():
    with pytest.raises(ValueError):
        distribute(mult2)

def test_simple_distribute():
    params_list = [1, 2, 3, 4]  # Simple list of integers
    expected_results = [2, 4, 6, 8]  # Expected results after processing

    actual_results = distribute(mult2, params_list)

    assert sorted(actual_results) == expected_results

def test_distribute_dict():
    params_list = [{"x": 1, "y": 2}, {"x": 2, "y": 2}, {"x": 3, "y": 2}, {"x": 4, "y": 2}]
    expected_results = [2, 4, 6, 8]

    actual_results = distribute(mult, kwargs_list=params_list)

    assert sorted(actual_results) == expected_results

def test_distribute_callback():
    params_list = [1, 2, 3, 4]  # Simple list of integers
    expected_results = [2, 4, 6, 8]
    set_expected_results = set(expected_results)  # Expected results after processing

    def call_me_back(result):
        set_expected_results.remove(result)

    actual_results = distribute(mult2, params_list, callback=call_me_back)

    assert sorted(actual_results) == expected_results
    assert len(set_expected_results) == 0

def test_on_complete(shared_int):
    params_list = [1, 2, 3, 4]  # Simple list of integers
    expected_results = [2, 4, 6, 8]

    actual_results = distribute(mult2, params_list, on_complete=on_complete)
    
    assert sorted(actual_results) == expected_results
    # assert shared_int.value == 1 ## TODO - Fix this

def test_on_complete_with_fails():
    distribute_module.IGNORE_ERROR_MESSAGES = True
    params_list = [1, 2, 3, 4]  # Simple list of integers
    expected_results = [1, 3]

    actual_results = distribute(error_on_even, params_list, on_complete=on_complete_with_fails)
    distribute_module.IGNORE_ERROR_MESSAGES = False

    assert sorted(actual_results) == expected_results
    # assert global_var_for_complete_with_fails.value

if __name__ == "__main__":
    pytest.main([ __file__])