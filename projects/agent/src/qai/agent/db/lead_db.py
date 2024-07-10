from logging import getLogger
from typing import Any, Optional
from pymongo.collection import Collection
from pymongo import MongoClient, UpdateOne
from pymongo.collection import ReturnDocument

from qai.agent.db.existing_customers_db import ExistingCustomersDatabase
from qai.agent.models.lead_model import Lead

log = getLogger(__name__)


class LeadDatabase:
    def __init__(
        self,
        connection_string,
        database,
        collection,
        existing_customers_db: Optional[ExistingCustomersDatabase] = None,
        skips: Optional[dict[str, str]] = None,
    ):
        # uuidRepresentation='standard'
        self.client : MongoClient = MongoClient(connection_string)
        self.db = self.client.get_database(database)
        self.collection = self.db.get_collection(collection)
        self.existing_customers_db = existing_customers_db
        skips = skips or {}
        self.skip_collection : dict[str, Collection] = {}
        for skip_type, col_name in skips.items():
            self.skip_collection[skip_type] = self.db.get_collection(col_name)

    def _insert_params(self, lead: Lead) -> dict:
        lead_dict = lead.model_dump()
        update_fields = {k: v for k, v in lead_dict.items() if k != "qid"}
        params = {
            "filter": {"id": lead.id},
            "update": {"$set": update_fields, "$setOnInsert": {"qid": str(lead.qid)}},
            "upsert": True,
        }
        return params

    def insert_lead(self, lead: Lead) -> Lead:
        params = self._insert_params(lead)
        params.update({"return_document": ReturnDocument.AFTER})
        result = self.collection.find_one_and_update(**params)
        if result:
            r = result
            if "id" in result:
                log.debug(f"Updated lead with id: {lead.id} qid: {r['qid']}")
            else:
                log.debug(f"Inserted new lead with id: {lead.id} qid: {r['qid']}")
            return Lead(**result)
        raise ValueError(f"Unable to insert lead: {lead.id}")

    def insert_leads(self, leads: list[Lead]):
        operations = []
        for lead in leads:
            params = self._insert_params(lead)

            operations.append(UpdateOne(**params))

        if operations:
            result = self.collection.bulk_write(operations)
            log.debug(f"Bulk operation completed: {result.bulk_api_result}")
            log.debug(f"Inserted: {result.upserted_count}, Updated: {result.modified_count}")

    def find_lead_by_id(self, lead_id: str) -> Optional[Lead]:
        lead_data = self.collection.find_one({"id": lead_id})
        if lead_data:
            return Lead(**lead_data)
        return None

    def find_lead_by_email(self, email: str) -> Optional[Lead]:
        data = self.collection.find_one({"email": email})
        if data:
            return Lead(**data)
        return None

    def find_lead_by_qid(self, qid: str) -> Optional[Lead]:
        lead_data = self.collection.find_one({"id": qid})
        if lead_data:
            return Lead(**lead_data)
        return None

    def load(
        self,
        requires: Optional[list[str]] = None,
        filter_existing_customers: bool = False,
        filter_skip_emails: bool = False,
        filter_skip_websites: bool = False,
        filter_skip_linkedin_urls: bool = False,
        filter_all_skips: bool = False,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[Lead]:
        ## Prepare the filters
        filters = filters or {}
        if filter_existing_customers:
            if not self.existing_customers_db:
                raise ValueError("Existing customers database not provided")
            existing_customers = self.existing_customers_db.collection.distinct("website")
            filters["company_website"] = {"$nin": existing_customers}
        
        if filter_skip_emails or filter_all_skips:
            col = self.skip_collection.get("skip_emails")
            if col is None:
                raise ValueError("Skip email collection not provided")
            objs = col.distinct("email")
            filters["email"] = {"$nin": objs}
        
        if filter_skip_websites or filter_all_skips:
            col = self.skip_collection.get("skip_websites")
            if col is None:
                raise ValueError("Skip website collection not provided")
            objs = col.distinct("website")
            filters["company_website"] = {"$nin": objs}

        if filter_skip_linkedin_urls or filter_all_skips:
            col = self.skip_collection.get("skip_linkedin_urls")
            if col is None:
                raise ValueError("Skip linkedin collection not provided")
            objs = col.distinct("linkedin_url")
            filters["linkedin_url"] = {"$nin": objs}
        
        # Add required fields to the filters
        if requires:
            for field in requires:
                ## ne None and also not empty
                filters[field] = {"$ne": None, "$ne": ""}

        ## Load from the database
        objs = []
        for data in self.collection.find(filters):
            objs.append(Lead(**data))
        return objs
