from logging import getLogger
from typing import Any, Optional
from pydantic import BaseModel
from pymongo import MongoClient, UpdateOne
from pymongo.collection import ReturnDocument

from qai.agent.models.lead_model import Lead

log = getLogger(__name__)

class BasicCompany(BaseModel):
    company: str
    website : str

class ExistingCustomersDatabase:
    def __init__(self, connection_string, database, collection):
        self.client = MongoClient(connection_string)
        self.db = self.client.get_database(database)
        self.collection = self.db.get_collection(collection)

    def load(self, filters: Optional[dict[str, Any]] = None) -> list[BasicCompany]:
        filters = filters or {}
        objs = []
        for data in self.collection.find(filters):
            objs.append(BasicCompany(**data))
        return objs
