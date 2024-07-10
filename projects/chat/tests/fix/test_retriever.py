import os
import tempfile
import unittest
from dataclasses import dataclass

from qai.chat import Query, cfg
from qai.chat.db import Retriever, get_retriever
from qai.chat.db.chroma.chroma import Chroma, ChromaConfig
from qai.chat.db.llama_index.llama_creator import LLamaIndex

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


class TestRetriever(unittest.TestCase):
    def test_get_chroma_retriever(self):
        r = get_retriever("chroma", config=cfg.chroma)
        self.assertIsNotNone(r)

    def test_get_llama_index(self):
        r = get_retriever("llamaindex", config=cfg.llamaindex)
        self.assertIsNotNone(r)

    def test_llama_index_local_create(self):
        files = os.listdir(f"{DATA_DIR}/test_website")
        files = [f for f in files if os.path.isfile(f"{DATA_DIR}/test_website/{f}")]

        with tempfile.TemporaryDirectory() as temp_dir:
            db_location = f"{temp_dir}/temp_index"
            idx = LLamaIndex(db_location=db_location, index_name="testcompany")
            idx : LLamaIndex = idx.get_or_create_index(
                website_dir=f"{DATA_DIR}/test_website",
                needs_meta=False,
            )
            context = idx.get_context("test")
            self.assertEqual(len(context), len(files))

    def test_llama_index_remote_create(self):
        files = os.listdir(f"{DATA_DIR}/test_website")
        company = "testcompany"
        files = [f for f in files if os.path.isfile(f"{DATA_DIR}/test_website/{f}")]
        r = get_retriever("chroma", config=cfg.chroma)
        if r.get_collection(company) is not None:
            r.delete_collection(company)
        idx = LLamaIndex(
            config={
                "chroma_config": ChromaConfig(
                    host="chromadb-load-balancer-735223093.us-east-1.elb.amazonaws.com", port=8000
                )
            },
            index_name=company,
        )
        idx.get_or_create_index(
            website_dir=f"{DATA_DIR}/test_website",
            needs_meta=False,
        )
        context = idx.get_context("test")

        self.assertEqual(len(context), len(files))
        r.delete_collection(company)
        self.assertIsNone(r.get_collection(company))


if __name__ == "__main__":
    test_name = ""
    if test_name:
        suite = unittest.TestSuite()
        suite.addTest(TestRetriever(test_name))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
