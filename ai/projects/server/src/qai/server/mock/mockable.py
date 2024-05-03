import functools
from typing import Any

from flask import jsonify, request
from pydantic import BaseModel


class mockable:
    """
    Decorator to check for required variables in the request
    """

    def __init__(self, model_cls: type[BaseModel]):
        self.model_cls = model_cls

    def __call__(self, func):
        @functools.wraps(func)
        def decorated_function(*args, **kwargs):
            instance = self.model_cls(**request.get_json())
            is_mock = getattr(instance, "mock", False)
            if is_mock:
                ofunc = getattr(__import__('qai.server.mock.mock_functions', fromlist=[func.__name__]), func.__name__)
                return ofunc(*args, **kwargs)
            return func(*args, **kwargs)

        return decorated_function
