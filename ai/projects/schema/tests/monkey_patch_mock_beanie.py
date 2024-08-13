"""
This module monkey patches the Beanie Document class to behave like a Pydantic BaseModel.
Useful for offline unit testing.
When using this module, you should import it before importing any other module that imports Beanie Document.
It also should be imported before pytest is run.
"""

import beanie
from pydantic import BaseModel


# Define a mock Document class that behaves like a Pydantic BaseModel
class MockDocument(BaseModel):
    def __init__(self, **data):
        super().__init__(**data)
        self.id = None

    @classmethod
    async def find(cls, *args, **kwargs):
        raise NotImplementedError

    @classmethod
    async def find_one(cls, *args, **kwargs):
        raise NotImplementedError

    async def save(self):
        raise NotImplementedError

    async def update(self):
        raise NotImplementedError

    async def delete(self):
        raise NotImplementedError


# Monkey patch the Beanie Document class to use MockDocument
beanie.Document = MockDocument  # type: ignore
