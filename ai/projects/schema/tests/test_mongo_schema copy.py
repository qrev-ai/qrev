# import pytest

# if __name__ == "__main__":
#     pytest.main(["-v", "--asyncio-mode=auto", __file__, "-rP"])

# import asyncio
# import importlib
# import inspect
# import json
# import random
# import sys
# import uuid
# from dataclasses import dataclass, field
# from datetime import UTC, datetime
# from pprint import pprint
# from typing import TYPE_CHECKING, Any, List, Optional, TypeAlias, TypeVar, cast

# import beanie
# import motor.motor_asyncio
# import phonenumbers
# from beanie import Document
# from beanie import Document as Document
# from beanie import PydanticObjectId, WriteRules, init_beanie
# from conftest import get_email_address
# from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
# from pi_conf import load_config
# from pydantic import BaseModel, ConfigDict, EmailStr, Field

# # from pydantic_settings import BaseSettings, SettingsConfigDict
# from pymongo import MongoClient
# from pymongo.collection import Collection, ReturnDocument

# from qai.schema import DocExtensions, ExtendedDocument
# from qai.schema.models import (
#     Address,
#     Company,
#     Email,
#     Job,
#     Name,
#     Person,
#     PhoneNumber,
#     PhoneType,
#     SocialMedia,
#     SocialMediaType,
#     UnlinkedEmail,
# )

# # from qrev_ai.libs.slintel_model import Lead


# cfg = load_config("qrev-ai-test")
# mongo = cfg.mongo
# db_name = "test-unit-schema"


# def get_classes_with_base(module_name, base_class):
#     try:
#         module = importlib.import_module(module_name)
#     except ImportError:
#         print(f"Error: Module '{module_name}' not found.")
#         return []

#     classes_with_base = []
#     for name, obj in inspect.getmembers(module, inspect.isclass):
#         if issubclass(obj, base_class) and obj != base_class:
#             classes_with_base.append(obj)

#     return classes_with_base


# @pytest.fixture(scope="session", autouse=True)
# async def client(request):
#     return AsyncIOMotorClient(f"mongodb+srv://lee:WkmQPO9yEROt29vE@testcluster.3go6gfm.mongodb.net")


# def get_or_create_eventloop():
#     try:
#         return asyncio.get_event_loop()
#     except RuntimeError as ex:
#         if "Event loop is closed" in str(ex):
#             loop = asyncio.new_event_loop()
#             asyncio.set_event_loop(loop)
#             return asyncio.get_event_loop()


# @pytest.fixture(scope="session", autouse=True)
# async def db(client: AsyncIOMotorClient):
#     # Generate a random db name
#     # db_name = f"test-{uuid.uuid4().hex[:8]}"
#     db_name = "test-unit-schema"
#     db = client.get_database(db_name)
#     models = get_classes_with_base("mongo_schema", Document)
#     await init_beanie(document_models=models, database=db)
#     yield db

#     try:
#         names = await client.list_database_names()
#         # if db_name in names:
#         #     await client.drop_database(db_name)
#         print(f"Database '{db_name}' dropped at the end of the session.")
#     except RuntimeError as ex:
#         print(f"Error: {ex}", file=sys.stderr)
#         print(f"Database '{db_name}' not dropped.", file=sys.stderr)


# # @pytest.mark.asyncio(scope="session")
# # async def test_person2(db: AsyncIOMotorDatabase, person):
# #     col = db.get_collection("people2")
# #     pass


# # @pytest.mark.asyncio(scope="session")
# # async def test_person(person: Person):
# #     await person.save()
# #     # check to see if the document is saved
# #     p = await Person.get(person.id)
# #     assert p
# #     assert p.eq(person)
# #     ## check delete
# #     await p.delete()
# #     p = await Person.get(person.id)
# #     assert not p


# # @pytest.mark.asyncio(scope="session")
# # async def test_unlinked_email(random_name):
# #     email = UnlinkedEmail(address=f"{get_email_address(*random_name)}")
# #     await email.save()
# #     # check to see if the document is saved
# #     e = await UnlinkedEmail.get(email.id)
# #     assert e
# #     assert e.eq(email)
# #     ## check delete
# #     await e.delete()
# #     e = await UnlinkedEmail.get(email.id)
# #     assert not e


# # @pytest.mark.asyncio(scope="session")
# # async def test_company_equality(company: Company):
# #     company2 = Company(
# #         name=company.name,
# #         domains=company.domains,
# #         emails=company.emails,
# #     )
# #     assert company.eq(company2)
# #     assert company2.domains
# #     company2.domains.append("example.org")
# #     assert not company.eq(company2)


# # @pytest.mark.asyncio(scope="session")
# # async def test_company_with_people(company: Company, person_list: list[Person]):
# #     print(f"test_company {company}")
# #     company.people = person_list
# #     await company.save(link_rule=WriteRules.WRITE)
# #     ## check person ids
# #     for p in company.people:
# #         assert p.id

# #     ## Check to see people are in People db
# #     for p in company.people:
# #         p2 = await Person.get(p.id)
# #         assert p2
# #         assert p2.eq(p)

# #     # check to see if the document is saved
# #     c = await Company.get(company.id)
# #     assert c
# #     assert c.eq(company)
# #     ## check delete
# #     await c.delete()
# #     c = await Company.get(company.id)
# #     assert not c

# #     ## Check to see people haven't been deleted
# #     for p in company.people:
# #         p2 = await Person.get(p.id)
# #         assert p2
# #         assert p2.eq(p)


