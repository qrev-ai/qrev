from typing import Optional

import pydantic
from flask_pydantic.exceptions import ValidationError
from pydantic import BaseModel, ConfigDict


class PersonModel(BaseModel):
    name: str
    email: str
    phone_number: str

