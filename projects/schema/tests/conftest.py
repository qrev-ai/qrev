import random
import uuid

import pytest

from qai.schema import Company, Email, Name, Person


@pytest.fixture
def random_name() -> tuple[str, str]:
    """returns random first_name and last_name"""
    return uuid.uuid4().hex[:8], uuid.uuid4().hex[:8]


def get_email_address(first_name: str, last_name: str) -> str:
    domain = random.choice(["example.com", "example.org", "example.net"])
    return f"{first_name}.{last_name}@{domain}"


@pytest.fixture
def person(random_name):
    return Person(
        name=Name(first=random_name[0], last=random_name[1]),
        emails=[
            Email(address=f"{get_email_address(*random_name)}"),
        ],
    )


@pytest.fixture
def person_list():
    l = []
    for i in range(5):
        rname = random_name()
        p = Person(
            name=Name(first=rname[0], last=rname[1]),
            emails=[
                Email(address=f"{get_email_address(*rname)}"),
            ],
        )
        l.append(p)
    return l


@pytest.fixture
def company(random_name):
    return Company(
        name=random_name[0],
        domains=[random_name[0] + ".com"],
        emails=[
            Email(address=f"{get_email_address(*random_name)}"),
        ],
    )
