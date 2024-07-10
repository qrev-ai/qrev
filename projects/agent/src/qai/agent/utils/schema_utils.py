def get_name(person: dict) -> str:
    """
    Get the name from the person dict.
    """
    name = person.get("name")
    if not name:
        first_name = person.get("first_name")
        last_name = person.get("last_name")
        if first_name and last_name:
            name = f"{first_name} {last_name}"
        else:
            name = first_name or last_name
    if not name:
        raise ValueError(f"Person must have a name. values={person}")
    return name
