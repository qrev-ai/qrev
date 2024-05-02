
from qai.agent.data.state_codes import state_codes


def refine_step_queries(steps: list[dict[str, str]]) -> list[dict[str, str]]:
    """
    Refine the step queries by replacing the technology names with the correct case from the database.

    Args:
        steps (list[dict[str, str]]): The list of steps to refine.

    Returns:
        list[dict[str, str]]: The refined list of steps.
    """

    ## separate company and people steps. Merge filters into the same step.
    def merge_steps(steps: list[dict[str, str]]) -> list[dict[str, str]]:
        """Merge the steps into a list of steps with the same category.

        Args:
            steps (list[dict[str, str]]): The list of steps to merge.

        Returns:
            list[dict[str, str]]: The merged list of steps.
        """
        new_steps = []
        old_step = None
        for d in steps:
            cat, s = d["category"], d["sentence"]
            is_company_step = cat.startswith("company")
            is_person_step = cat.startswith("people")
            is_industry_step = cat.startswith("industr")
            if is_company_step:
                if old_step == is_company_step:
                    new_steps[-1][1] += " " + s
                else:
                    new_steps.append(["company", s])
                old_step = is_company_step
            elif is_industry_step:
                if old_step == is_industry_step:
                    new_steps[-1][1] += " " + s
                else:
                    new_steps.append(["industry", s])
                old_step = is_industry_step
            elif is_person_step:
                if old_step == is_person_step:
                    new_steps[-1][1] += " " + s
                else:
                    new_steps.append(["people", s])
                old_step = is_person_step
            else:
                new_steps.append([cat, s])
                old_step = None
        return new_steps

    steps = merge_steps(steps)

    def replace(sentence: str) -> str:
        # for tech, proper_name in technologies.items():
        #     ## Replace the potentially wrong case technology name with the correct case from the database
        #     sentence = re.sub(tech, proper_name, sentence, re.IGNORECASE)
        return sentence

    refined_steps = []
    for cat, sentence in steps:
        refined_steps.append([cat, replace(sentence)])
    return refined_steps


def modify_sql_query(original_sql, prefix=""):
    """
    Modifies the provided SQL query by replacing the initial SELECT statement
    with 'SELECT id'. This function assumes the query contains joins from multiple tables.

    Args:
    original_sql (str): The original SQL query string.

    Returns:
    str: The modified SQL query with 'SELECT id' as the initial statement.
    """

    # Split the query into segments
    segments = original_sql.split("FROM")

    # Check if the query is valid (has at least one FROM segment)
    if len(segments) < 2:
        raise ValueError("The SQL query does not seem to contain a valid 'FROM' clause.")
    seg0 = segments[0]
    if not prefix and "." in seg0:
        ## Find the prefix after the SELECT
        prefix = seg0.split("SELECT")[1].split(".")[0] + "."

    # Replace the initial SELECT statement with 'SELECT id'
    segments[0] = f"SELECT {prefix}id, * "

    # Reassemble the query
    modified_sql = "FROM".join(segments)

    ## State code check
    if "location_state" in modified_sql:
        for state_longname, state_code in state_codes.items():
            modified_sql = modified_sql.replace(state_longname, state_code)

    return modified_sql
