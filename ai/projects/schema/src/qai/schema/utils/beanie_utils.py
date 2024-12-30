from logging import getLogger
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.typings import _DocumentType
from qai.schema.extensions import get_extended_documents
from qai.schema.models.mongo_model import MongoConfig

log = getLogger(__name__)


async def init(
    mongo_uri: str, mongo_db: Optional[str] = None, mongo_config: Optional[MongoConfig] = None
) -> AsyncIOMotorDatabase:
    if mongo_config:
        mongo_uri = mongo_config.uri
        mongo_db = mongo_config.db
    log.debug(f"Working with {mongo_uri} Connecting to MongoDB at {mongo_db}")
    if not mongo_db:
        raise ValueError("MongoDB database name is required")
    client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_uri)
    db = client.get_database(name=mongo_db)
    await init_beanie(database=db, document_models=get_extended_documents())
    return db
