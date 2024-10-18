import json
import re
from typing import Any, Optional, overload

import pytest
from jinja2 import (
    Environment,
    FunctionLoader,
    StrictUndefined,
    TemplateError,
    Undefined,
    UndefinedError,
)
from pydantic import BaseModel


class UnmatchedVariableError(Exception):
    """Custom exception raised when an unmatched variable is found in the format string."""

    pass


def render_template(template_string, allow_undefined=False, **kwargs):
    def handle_undefined(value):
        return None if isinstance(value, Undefined) else value

    def loader(template):
        return template, None, lambda: False

    env = Environment(loader=FunctionLoader(loader), undefined=StrictUndefined)
    env.filters["handle_undefined"] = handle_undefined

    if allow_undefined:
        # Wrap all variable references with the handle_undefined filter
        template_string = template_string.replace("{{", "{{ (").replace(
            "}}", ")|handle_undefined }}"
        )

    template = env.from_string(template_string)
    try:
        return template.render(**kwargs)
    except TemplateError as e:
        raise ValueError(str(e))


def check_unmatched_braces(text):
    stack = []
    for char in text:
        if char == "{":
            stack.append(char)
        elif char == "}":
            if not stack:
                return True  # Unmatched closing brace
            stack.pop()

    return len(stack) > 0 or not is_valid_json(text)


def is_valid_json(text):
    try:
        json.loads(text)
        return True
    except json.JSONDecodeError:
        return False
