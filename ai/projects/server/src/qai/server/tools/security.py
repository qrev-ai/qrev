import functools
from logging import getLogger

from flask import current_app as app
from flask import request

log = getLogger(__name__)


def token_required(func):
    """
    Decorator to check for a valid token
    """

    @functools.wraps(func)
    def decorated_function(*args, **kwargs):
        try:
            server_config = app.cfg.server
        except AttributeError:
            raise AttributeError(
                f"Error! No server config. set server.allowed_tokens in config file."
            )

        try:
            allowed_tokens = set(server_config.allowed_tokens)
        except AttributeError:
            raise AttributeError(
                f"Error! No allowed tokens in config. set server.allowed_tokens in config file. "
            )
        ## Get and remove token from request, we don't want to be printing this
        token = request.get_json().pop("token", "")
        if token not in allowed_tokens:
            log.error(f"Error! Invalid token <{token}> === {allowed_tokens}")
            raise Exception("Error! Invalid token")
        return func(*args, **kwargs)

    return decorated_function


def check_variable_exists(variables, in_data) -> bool:
    """
    Check if a variable exists in the request
    Args:
        variables: str or list of str
        in_data: dict
    Returns:
        bool : True if variable exists
    """
    if isinstance(variables, str):
        variables = [variables]
    for variable in variables:
        if variable not in in_data:
            raise Exception(f"Error! {variable} not in request")
    return True


def check_variable_one_of(variables, in_data, allow_more_than_one=False) -> bool:
    """
    Check if a variable s one of many
    """
    if isinstance(variables, str):
        variables = [variables]
    if not isinstance(variables, set):
        variables = set(variables)
    found = False
    for input_var in in_data.keys():
        if input_var in variables:
            if found:
                raise Exception(f"Error! Both {found} and {input_var} were in request")
            if allow_more_than_one:
                return True
            found = input_var
    if not found:
        raise Exception(f"Error! None of {variables} were in {in_data} request")
    return True
