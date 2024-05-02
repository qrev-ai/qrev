import os
import unittest
from dataclasses import dataclass
from typing import Dict, List

import chromadb
from chromadb.config import Settings
from flask import Flask

from qai.ai.utils.token_utils import num_tokens
from qai.chat.config import cfg
from qai.chat.layers.llm.chatbot import LLM, Chatbot
from qai.chat.layers.query import Query, QueryReturn
from qai.chat.prompt.config import PromptConfig
from distutils.util import strtobool


if strtobool(os.getenv("TEST_LOCAL_ONLY", "False")):
    print("Skipping remote test")
    exit()


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

    def test_query_with_chroma_query(self):
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
                    "token": cfg.server.allowed_tokens[0],
                    "query": "what are your solutions?",
                    "mock": False,
                    "user_id": "1",
                    "company_name": "Ardvaarks R Us",
                    # "company_id": "50d4a259-388c-4ec8-aca5-c4ea4e69d3c1",
                    # "verbose_return": True,
                    # "use_context": True,
                    # "use_history": False,
                },
            )
            print(f"result of test_query_with_chroma_query: {r.get_json()}")
            # self.assertEqual(r.status_code, 200)

            # self.assertEqual(r.get_json()["response"], "Mocked Response")


    def test_campaign(self):
        client = app.test_client()
        with app.test_request_context():
            r = client.get(
                "/campaign",
                json={
                    "token": cfg.server.allowed_tokens[0],
                    "query": "what is the deductible for a family plan?",
                    "mock": True,
                    "user_id": "1",
                    "company_id": "aaca9cd7-959a-4a31-93a8-b524cb58ff05",
                },
            )
            print(f"result of test_campaign: {r.get_json()}")
            self.assertEqual(r.status_code, 200)

if __name__ == "__main__":
    test_name = "test_campaign"
    if test_name:
        suite = unittest.TestSuite()
        suite.addTest(TestServing(test_name))
        unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
