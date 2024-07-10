def check_variable_exists(variables, in_data):
    if isinstance(variables, str):
        variables = [variables]
    for variable in variables:
        if variable not in in_data:
            raise Exception(f"Error! {variable} not in request")
    return True


def check_variable_one_of(variables, in_data, allow_more_than_one=False):
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
