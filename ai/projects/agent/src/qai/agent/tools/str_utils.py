import json
import re
from typing import Any, Optional, overload

import pytest
from jinja2 import (
    Environment,
    FunctionLoader,
    StrictUndefined,
    TemplateError,
    TemplateSyntaxError,
    Undefined,
    UndefinedError,
)
from jinja2.defaults import VARIABLE_END_STRING, VARIABLE_START_STRING
from pydantic import BaseModel


class UnmatchedVariableError(Exception):
    """Custom exception raised when an unmatched variable is found in the format string."""

    pass


def render_template(
    template_string,
    allow_undefined=False,
    variable_start_string: str = VARIABLE_START_STRING,
    variable_end_string: str = VARIABLE_END_STRING,
    block_start_string: Optional[str] = None,
    block_end_string: Optional[str] = None,
    comment_start_string: Optional[str] = None,
    comment_end_string: Optional[str] = None,
    **kwargs,
):
    def handle_undefined(value):
        return None if isinstance(value, Undefined) else value

    def loader(template):
        return template, None, lambda: False

    env = Environment(
        loader=FunctionLoader(loader),
        undefined=StrictUndefined,
        variable_start_string=variable_start_string,
        variable_end_string=variable_end_string,
        block_start_string=block_start_string or f"{variable_start_string[0]}%",
        block_end_string=block_end_string or f"%{variable_end_string[-1]}",
        comment_start_string=comment_start_string or f"{variable_start_string}#",
        comment_end_string=comment_end_string or f"#{variable_end_string}",
    )
    env.filters["handle_undefined"] = handle_undefined

    if allow_undefined:
        template_string = template_string.replace(
            variable_start_string, f"{variable_start_string} ("
        ).replace(variable_end_string, f")|handle_undefined {variable_end_string}")
    template = env.from_string(template_string)
    try:
        return template.render(**kwargs)
    except TemplateError as e:
        raise ValueError(str(e))


def has_unmatched(
    template_str,
    variable_start_string: str = VARIABLE_START_STRING,
    variable_end_string: str = VARIABLE_END_STRING,
    block_start_string: Optional[str] = None,
    block_end_string: Optional[str] = None,
    comment_start_string: Optional[str] = None,
    comment_end_string: Optional[str] = None,
) -> bool:
    """
    Uses Jinja2's parser to check for unmatched braces in template string.
    Returns True if there are unmatched braces, False if properly matched.
    """

    if len(variable_start_string) == len(variable_end_string) == 1:
        stack = []
        for char in template_str:
            if char == variable_start_string:
                stack.append(char)
            elif char == variable_end_string:
                if not stack:
                    return True
                stack.pop()
        return len(stack) > 0

    # # Check for stray closing delimiters
    # if template_str.count(variable_end_string) > template_str.count(variable_start_string):
    #     return True

    # Try JSON validation for any {...} content
    if variable_start_string == "{" and variable_end_string == "}":
        start = 0
        while True:
            start = template_str.find("{", start)
            if start == -1:
                break
            end = template_str.find("}", start)
            if end == -1:
                return True
            try:
                json.loads(template_str[start : end + 1])
                start = end + 1
                continue
            except json.JSONDecodeError:
                pass
            start += 1

    env = Environment(
        variable_start_string=variable_start_string,
        variable_end_string=variable_end_string,
        block_start_string=block_start_string or f"{variable_start_string[0]}%",
        block_end_string=block_end_string or f"%{variable_end_string[-1]}",
        comment_start_string=comment_start_string or f"{variable_start_string}#",
        comment_end_string=comment_end_string or f"#{variable_end_string}",
    )

    try:
        env.from_string(template_str)
        return False
    except TemplateSyntaxError as e:
        return True


def is_valid_json(text):
    try:
        json.loads(text)
        return True
    except json.JSONDecodeError:
        return False

