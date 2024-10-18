import json

import pytest

from qai.agent.tools.str_utils import render_template


class Person:
    def __init__(self, name, company, age):
        self.name = name
        self.company = company
        self.age = age

    @property
    def myproperty(self):
        return "property"


class Company:
    def __init__(self, name, department):
        self.name = name
        self.department = department


@pytest.fixture
def sample_data():
    return {
        "person": Person("John Doe", Company("Acme Inc.", "IT"), age=30),
        "dict_data": {"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]},
    }


def test_render_template_object(sample_data):
    result = render_template(
        "Name: {{ person.name }}, Company: {{ person.company.name }}", **sample_data
    )
    assert result == "Name: John Doe, Company: Acme Inc."

    result = render_template("Department: {{ person.company.department }}", **sample_data)
    assert result == "Department: IT"


def test_render_template_dict(sample_data):
    result = render_template("First user: {{ dict_data.users[0].name }}", **sample_data)
    assert result == "First user: Alice"

    result = render_template("Second user age: {{ dict_data.users[1].age }}", **sample_data)
    assert result == "Second user age: 25"


def test_render_template_with_list_index(sample_data):
    result = render_template(
        "First user: {{ dict_data.users[list_index].name }}", list_index=0, **sample_data
    )
    assert result == "First user: Alice"

    result = render_template(
        "Second user age: {{ dict_data.users[list_index].age }}", list_index=1, **sample_data
    )
    assert result == "Second user age: 25"


def test_render_template_mixed_explicit_and_implicit_index(sample_data):
    result = render_template(
        "Users: {{ dict_data.users[0].name }} and {{ dict_data.users[list_index].name }}",
        list_index=1,
        **sample_data
    )
    assert result == "Users: Alice and Bob"


def test_render_template_unmatched_variable():
    with pytest.raises(ValueError):
        render_template("Test: {{ unmatched.variable }}", test="data")


def test_render_template_unmatched_dict_variable2(sample_data):
    with pytest.raises(ValueError):
        render_template("{{ nonexistent.company }}", **sample_data)


def test_render_template_partial_match():
    person = {"name": "John", "age": 30}
    result = render_template(
        "Name: {{ person.name }}, Unknown: {{ person.unknown }}",
        allow_undefined=True,
        person=person,
    )
    assert result == "Name: John, Unknown: None"


def test_render_template_all_matched():
    person = {"name": "John", "age": 30}
    result = render_template("Name: {{ person.name }}, Age: {{ person.age }}", person=person)
    assert result == "Name: John, Age: 30"


def test_render_template_escaped_braces():
    result = render_template("{{ '{{' }}This{{ '}}' }} is {{ '{{' }}escaped{{ '}}' }}", test="data")
    assert result == "{{This}} is {{escaped}}"


def test_render_template_completely_unmatched():
    with pytest.raises(ValueError):
        render_template("{{ unmatched.variable }}", test="data")


def test_render_template_nested_escaped_braces():
    assert (
        render_template("{{ '{{' }}Outer {{ '{{' }}Inner{{ '}}' }}{{ '}}' }}", test="data")
        == "{{Outer {{Inner}}}}"
    )


def test_render_template_escaped_braces_and_placeholders():
    result = render_template(
        "{{ '{{' }}Escaped{{ '}}' }} and {{ person.name }}", person=Person("John", None, age=30)
    )
    assert result == "{{Escaped}} and John"


def test_render_template_empty_string():
    assert render_template("", test="data") == ""


def test_render_template_no_placeholders():
    assert render_template("Hello, World!", test="data") == "Hello, World!"


def test_render_template_with_json_like_structure():
    result = render_template('JSON: {{ \'{"key": "value"}\' }}', test="data")
    assert result == 'JSON: {"key": "value"}'


def test_render_template_with_json_and_placeholders():
    person = {"name": "John"}
    result = render_template(
        'Name: {{ person.name }}, Data: {{ \'{"key": "value"}\' }}', person=person
    )
    assert result == 'Name: John, Data: {"key": "value"}'


def test_render_template_with_json_string(sample_data):
    json_string = """
    {
        "name": "{{ person.name }}",
        "age": {{ person.age }},
        "company": "{{ person.company.name }}"
    }
    """
    result = render_template(json_string, **sample_data)
    parsed_result = json.loads(result)
    assert parsed_result == {"name": "John Doe", "age": 30, "company": "Acme Inc."}


def test_render_template_with_json_and_list_index(sample_data):
    sample_data["users"] = [{"name": "Alice", "age": 25}, {"name": "Bob", "age": 35}]
    json_string = """
    {
        "user": {
            "name": "{{ users[list_index].name }}",
            "age": {{ users[list_index].age }}
        }
    }
    """
    result = render_template(json_string, list_index=1, **sample_data)
    parsed_result = json.loads(result)
    assert parsed_result == {"user": {"name": "Bob", "age": 35}}


def test_render_template_with_json_and_regular_placeholders(sample_data):
    mixed_string = """
    Regular text: {{ person.name }} works at {{ person.company.name }}
    JSON data: {
        "employee": "{{ person.name }}",
        "workplace": "{{ person.company.name }}",
        "department": "{{ person.company.department }}"
    }
    """
    result = render_template(mixed_string, **sample_data)
    assert "Regular text: John Doe works at Acme Inc." in result
    assert '"employee": "John Doe"' in result
    assert '"workplace": "Acme Inc."' in result
    assert '"department": "IT"' in result


def test_render_template_if_logic():
    template_string = """
    {% if condition %}
    Condition is true
    {% else %}
    Condition is false
    {% endif %}

    {% if number > 10 %}
    Number is greater than 10
    {% elif number < 10 %}
    Number is less than 10
    {% else %}
    Number is equal to 10
    {% endif %}
    """

    # Test case 1: condition is True, number > 10
    result = render_template(template_string, condition=True, number=15)
    expected_output = """
    Condition is true

    Number is greater than 10
    """
    assert " ".join(result.split()) == " ".join(expected_output.split())

    # Test case 2: condition is False, number < 10
    result = render_template(template_string, condition=False, number=5)
    expected_output = """
    Condition is false

    Number is less than 10
    """
    assert " ".join(result.split()) == " ".join(expected_output.split())

    # Test case 3: condition is False, number = 10
    result = render_template(template_string, condition=False, number=10)
    expected_output = """
    Condition is false

    Number is equal to 10
    """
    assert " ".join(result.split()) == " ".join(expected_output.split())


def test_render_template_loop_logic():
    template_string = """
    {% for item in items %}
    - {{ item }}
    {% endfor %}

    {% for user in users %}
    {{ loop.index }}. {{ user.name }} ({{ user.age }})
    {% endfor %}

    Reversed list:
    {% for number in numbers|reverse %}
    {{ number }}{% if not loop.last %}, {% endif %}
    {% endfor %}
    """

    test_data = {
        "items": ["apple", "banana", "cherry"],
        "users": [
            {"name": "Alice", "age": 30},
            {"name": "Bob", "age": 25},
            {"name": "Charlie", "age": 35},
        ],
        "numbers": [1, 2, 3, 4, 5],
    }

    result = render_template(template_string, **test_data)
    expected_output = """
    - apple
    - banana
    - cherry

    1. Alice (30)
    2. Bob (25)
    3. Charlie (35)

    Reversed list:
    5, 4, 3, 2, 1
    """

    assert " ".join(result.split()) == " ".join(expected_output.split())


def test_render_property(sample_data):
    result = render_template("{{person.myproperty}}", **sample_data)
    assert result == "property"


if __name__ == "__main__":
    pytest.main([__file__])
