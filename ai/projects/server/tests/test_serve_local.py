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

    def test_campaign(self):
        cfg.clear()
        cfg.update(**test_cfg)
        client = app.test_client()
        from qai.server.models import CampaignInputModel
        m = CampaignInputModel(
            query="Make a campaign for people.",
            user_id="1",
            token=TOKEN,
            mock=True,
        )
        with app.test_request_context():
            r = client.get(
                "/campaign",
                json=m.model_dump(),
            )
            self.assertEqual(r.status_code, 200)

if __name__ == "__main__":
    test_name = "test_set_loglevel"
    if test_name:
        suite = unittest.TestSuite()
        suite.addTest(TestServing(test_name))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
