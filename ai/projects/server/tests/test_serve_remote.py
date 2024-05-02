import os
import unittest
from distutils.util import strtobool

import chromadb
from chromadb.config import Settings
from qai.chat.config import cfg

from qai.server.serve import app

REMOTE_TEST = strtobool(os.getenv("TEST_REMOTE", "False"))
if not REMOTE_TEST:
    print("Skipping remote tests for test_server_remote.py. enable by TEST_REMOTE=True")

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
        if not REMOTE_TEST:
            return
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
                },
            )
            print(f"result of test_query_with_chroma_query: {r.get_json()}")

    def test_campaign(self):
        if not REMOTE_TEST:
            return
        client = app.test_client()
        with app.test_request_context():
            r = client.get(
                "/campaign",
                json={
                    "token": cfg.server.allowed_tokens[0],
                    "query": "what is the deductible for a family plan?",
                    "mock": True,
                    "user_id": "1",
                    "company_id": "testid1",
                },
            )
            print(f"result of test_campaign: {r.get_json()}")
            self.assertEqual(r.status_code, 200)


if __name__ == "__main__":
    test_name = ""
    if test_name:
        suite = unittest.TestSuite()
        suite.addTest(TestServing(test_name))
        unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
