from typing import Optional

from pydantic import BaseModel, Field


class MongoConfig(BaseModel):
    uri: str = Field(..., title="MongoDB URI")
    database: Optional[str] = Field(default=None, title="MongoDB Database")
    collection: Optional[str] = Field(default=None, title="MongoDB Collection")
