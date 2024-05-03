import ctypes
import multiprocessing
import unittest
from unittest.mock import patch

from qai.agent.utils.distribute import adistribute, distribute
from qai.agent.utils import distribute as distribute_module

global_var_for_on_complete = multiprocessing.Value(ctypes.c_bool, 0)  # (type, init value)


def mult(x, y):
    return x * y


def mult2(param):
    return param * 2


def error_on_even(x):
    if x % 2 == 0:
        raise ValueError(f"Error on {x}")
    return x


def on_complete(nsuccesses, nerrors):
    global_var_for_on_complete.value = True


class TestMultiprocessingFunctionality(unittest.TestCase):
    def test_empty_distribute(self):
        """
        Test case for the multiprocessing with empty list of parameters
        """
        params_list = []  # Simple list of integers
        expected_results = []  # Expected results after processing

        actual_results = distribute(mult2, params_list)

        # Check if the results are as expected
        self.assertEqual(sorted(actual_results), expected_results)

    def test_none_distribute(self):
        """
        Test case for the multiprocessing with No parameters
        """
        self.assertRaises(ValueError, distribute, (mult2,))


    def test_simple_distribute(self):
        """
        Test case for the multiprocessing function execution
        """
        params_list = [1, 2, 3, 4]  # Simple list of integers
        expected_results = [2, 4, 6, 8]  # Expected results after processing

        actual_results = distribute(mult2, params_list)

        # Check if the results are as expected
        self.assertEqual(sorted(actual_results), expected_results)

    def test_distribute_dict(self):
        """
        Test case for the multiprocessing function execution with dictionary parameters
        """
        params_list = [{"x": 1, "y": 2}, {"x": 2, "y": 2}, {"x": 3, "y": 2}, {"x": 4, "y": 2}]

        expected_results = [2, 4, 6, 8]

        actual_results = distribute(mult, kwargs_list=params_list)

        # Check if the results are as expected
        self.assertEqual(sorted(actual_results), expected_results)

    def test_distribute_callback(self):
        """
        Test case for the multiprocessing function execution with callback
        """
        params_list = [1, 2, 3, 4]  # Simple list of integers
        expected_results = [2, 4, 6, 8]
        set_expected_results = set(expected_results)  # Expected results after processing

        def call_me_back(result):
            set_expected_results.remove(result)

        actual_results = distribute(mult2, params_list, callback=call_me_back)

        # Check if the results are as expected
        self.assertEqual(sorted(actual_results), expected_results)
        self.assertTrue(len(set_expected_results) == 0)

    def test_on_complete(self):
        """
        Test case for the multiprocessing function execution with on_complete
        """
        global_var_for_on_complete.value = False
        params_list = [1, 2, 3, 4]  # Simple list of integers
        expected_results = [2, 4, 6, 8]

        actual_results = distribute(mult2, params_list, on_complete=on_complete)

        # Check if the results are as expected
        self.assertEqual(sorted(actual_results), expected_results)
        # self.assertTrue(global_var_for_on_complete.value)

    def test_on_complete_with_fails(self):
        """
        Test case for the multiprocessing function execution with on_complete
        """
        ## TODO fix this test, how to test on_complete
        global_var_for_on_complete.value = False
        distribute_module.IGNORE_ERROR_MESSAGES = True
        # Test case for the multiprocessing function execution
        params_list = [1, 2, 3, 4]  # Simple list of integers
        expected_results = [1, 3]
        
        actual_results = distribute(error_on_even, params_list, on_complete=on_complete)
        distribute_module.IGNORE_ERROR_MESSAGES = False

        # Check if the results are as expected
        self.assertEqual(sorted(actual_results), expected_results)
        # print(f" Result: {global_var_for_on_complete.value}")
        # self.assertTrue(global_var_for_on_complete.value)

    def test_async(self):
        ## TODO fix this test, how to test on_complete
        params_list = [1]

        ph = adistribute(mult2, params_list, on_complete=on_complete)
        # self.assertTrue(global_var_for_on_complete.value)


if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestMultiprocessingFunctionality(testmethod))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
