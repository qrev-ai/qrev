import os
import unittest
from dataclasses import dataclass
from typing import Dict, List

import chromadb
from chromadb.config import Settings
from flask import Flask
from qai.ai.utils.token_utils import num_tokens
from qai.chat.layers.llm.chatbot import LLM, Chatbot
from qai.chat.layers.query import Query, QueryReturn
from qai.chat.prompt.config import PromptConfig

from qai.server.config import cfg

cfg.clear()
TOKEN = "test_token"
test_cfg = {
    "server": {"allowed_tokens": [TOKEN]},
    "chroma": {"host": "localhost", "port": 8000},
    "website_name_map": {"test": "testid"},
    "model": {"name": "gpt-3.5-turbo"},
}

cfg.update(**test_cfg)

from qai.server.serve import app

if "CHROMA_SERVER_AUTH_CREDENTIALS" in os.environ:
    settings = Settings(
        chroma_client_auth_provider="chromadb.auth.token.TokenAuthClientProvider",
        chroma_client_auth_credentials=os.environ.get("CHROMA_SERVER_AUTH_CREDENTIALS"),
        anonymized_telemetry=False,
    )
else:
    settings = Settings(anonymized_telemetry=False)


class TestServing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pass

    def test_heartbeat(self):
        cfg.clear()
        cfg.update(**test_cfg)
        client = app.test_client()
        with app.test_request_context():
            r = client.get("/heartbeat")
            self.assertEqual(r.get_json(), {"status": "OK"})
            self.assertEqual(r.status_code, 200)

    def test_set_loglevel(self):
        cfg.clear()
        cfg.update(**test_cfg)
        client = app.test_client()
        with app.test_request_context():
            r = client.get(
                "/set_loglevel/debug",
                json={
                    "token": TOKEN,
                },
            )
            self.assertEqual(r.get_json()["status"], "OK")
            self.assertEqual(r.status_code, 200)

    def test_get_collection_exists(self):
        cfg.clear()
        cfg.update(**test_cfg)
        client = app.test_client()
        with app.test_request_context():
            col_name = "test_collection"
            c = chromadb.HttpClient(
                host=app.cfg.chroma.host,
                port=app.cfg.chroma.port,
                settings=settings,
            )
            c.create_collection(col_name)
            r = client.get(
                "/get_collection",
                json={
                    "token": TOKEN,
                    "collection_name": col_name,
                },
            )
            c.delete_collection(col_name)
            self.assertEqual(r.status_code, 200)

    def test_query_mock_with_chroma_query(self):
        # from llama_index.core.llms import mock

        # os.environ["IS_TESTING"] = "True"
        cfg.clear()
        cfg.update(**test_cfg)

        client = app.test_client()
        with app.test_request_context():
            c = chromadb.HttpClient(
                host=app.cfg.chroma.host,
                port=app.cfg.chroma.port,
                settings=settings,
            )
            print(c.list_collections())
            r = client.get(
                "/",
                json={
                    "token": TOKEN,
                    "query": "what are your solutions?",
                    "mock": True,
                    "user_id": "1",
                    "company_name": "Aardvarks Unite",
                },
            )
            print(f"result of test_query_mock_with_chroma_query: {r.get_json()}")
            self.assertEqual(r.status_code, 200)

            self.assertEqual(r.get_json()["response"], "Mocked Response")

    # def test_query_mock_with_chroma_query_change_model(self):
    #     app = create_app(cfg)
    #     client = app.test_client()
    #     with app.test_request_context():
    #         model_name = "test_model"
    #         r = client.get(
    #             "/",
    #             json={
    #                 "token": TOKEN,
    #                 "collection_name": "nayya",
    #                 "query": "what is the deductible for a family plan?",
    #                 "mock": True,
    #                 "company_name": "nayya",
    #                 "verbose_return": True,
    #                 "model": model_name,
    #                 "use_history": False,
    #             },
    #         )
    #         j = r.get_json()
    #         self.assertEqual(r.status_code, 200)
    #         self.assertEqual(j["model"], model_name)

    # def test_campaigns(self):
    #     app = create_app(cfg)
    #     client = app.test_client()
    #     with app.test_request_context():
    #         r = client.get(
    #             "/campaign",
    #             json={
    #                 "token": TOKEN,
    #                 "query": "what is the deductible for a family plan?",
    #                 "mock": True,
    #                 "user_id": "1",
    #                 "company_id": "aaca9cd7-959a-4a31-93a8-b524cb58ff05",
    #             },
    #         )
    #         self.assertEqual(r.status_code, 200)
    #         print(f"result of test_campaigns: ")
    #         from pprint import pprint

    #         pprint(r.get_json())
    #         self.assertEqual(len(r.get_json()["list_of_campaign_emails"]), 2)

    def test_chat(self):
        cfg.clear()
        cfg.update(**test_cfg)
        client = app.test_client()
        with app.test_request_context():
            r = client.get(
                "/",
                json={
                    "token": TOKEN,
                    "query": "What time is it?",
                    "user_id": "1",
                    "company_name": "Aardvarks Unite",
                    "verbose_return": True,
                    "use_context": True,
                    "use_history": False,
                },
            )
            print(f"result of test_chat: {r.get_json()}")
            self.assertEqual(r.status_code, 200)
    
    def test_campaign(self):
        cfg.clear()
        cfg.update(**test_cfg)
        client = app.test_client()
        with app.test_request_context():
            r = client.get(
                "/campaign",
                json={
                    "query": "what is the deductible for a family plan?",
                    "user_id": "1",
                    "token": TOKEN,
                    "mock": True,
                    # "company_id": "aaca9cd7-959a-4a31-93a8-b524cb58ff05",
                },
            )
            print(f"result of test_campaign: {r.get_json()}")
            self.assertEqual(r.status_code, 200)

if __name__ == "__main__":
    test_name = "test_campaign"
    if test_name:
        suite = unittest.TestSuite()
        suite.addTest(TestServing(test_name))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
