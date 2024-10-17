import functools

from flask import request
from pydantic import BaseModel


class mockable:
    """
    A decorator class to enable mocking of functions based on request data.

    This decorator allows you to mock functions by checking if the Pydantic model
    created from the request JSON data has a `mock` attribute set to True. If it does,
    the decorator dynamically imports a mock function with the same name as the decorated
    function from a specified module and calls it instead of the original function.

    Attributes:
        model_cls (type[BaseModel]): The Pydantic model class used to create an instance
            from the request JSON data.

    Methods:
        __call__(func):
            A method that wraps the decorated function to enable mocking based on the
            request data.
    """

    def __init__(self, model_cls: type[BaseModel]):
        self.model_cls = model_cls

    def __call__(self, func):
        """
        Wraps the decorated function to enable conditional mocking based on request data.

        This method parses the request JSON data into an instance of the provided Pydantic
        model class. It checks if the instance has a `mock` attribute set to True. If so,
        it dynamically imports a mock function with the same name as the decorated function
        from the `qai.server.mock.mock_functions` module and calls it with the same arguments
        as the original function. Otherwise, it calls the original function.

        Args:
            func (Callable): The function to be decorated.

        Returns:
            Callable: The wrapped function that may perform mocking based on the request data.
        """

        @functools.wraps(func)
        def decorated_function(*args, **kwargs):
            instance = self.model_cls(**request.get_json())
            if getattr(instance, "mock", False):
                impt = __import__("qai.server.mock.mock_functions", fromlist=[func.__name__])
                mock_func = getattr(impt, func.__name__)
                return mock_func(*args, **kwargs)
            return func(*args, **kwargs)

        return decorated_function
