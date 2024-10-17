import os
import pytest
from distutils.util import strtobool
from logging import getLogger

import chromadb
from chromadb.config import Settings
from qai.chat.config import cfg

from qai.server.serve import app

log = getLogger(__name__)

REMOTE_TEST = strtobool(os.getenv("TEST_REMOTE", "False"))
if not REMOTE_TEST:
    log.warning("Skipping remote tests for test_server_remote.py. enable by TEST_REMOTE=True")

# Remove the conditional settings creation
settings = Settings(
    chroma_api_impl="chromadb.api.fastapi.FastAPI",
    chroma_server_host=os.environ.get("CHROMA_SERVER_HOST", "localhost"),
    chroma_server_http_port=os.environ.get("CHROMA_SERVER_HTTP_PORT", 8000),
    chroma_server_ssl_enabled=strtobool(os.environ.get("CHROMA_SERVER_SSL_ENABLED", "False")),
    anonymized_telemetry=False,
)

@pytest.fixture(scope="module")
def client():
    return app.test_client()

@pytest.fixture(scope="module")
def chroma_client():
    return chromadb.Client(settings)

@pytest.mark.skipif(not REMOTE_TEST, reason="Remote tests are disabled")
def test_query_with_chroma_query(client, chroma_client):
    with app.test_request_context():
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
        log.debug(f"result of test_query_with_chroma_query: {r.get_json()}")

@pytest.mark.skipif(not REMOTE_TEST, reason="Remote tests are disabled")
def test_campaign(client):
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
        log.debug(f"result of test_campaign: {r.get_json()}")
        assert r.status_code == 200

if __name__ == "__main__":
    pytest.main()