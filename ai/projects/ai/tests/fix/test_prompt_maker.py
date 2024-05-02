import os
import tempfile
import unittest
from dataclasses import dataclass

from qai.ai import Query, cfg
from qai.ai.search.retriever import Retriever
from qai.ai.db.chroma.chroma import Chroma, ChromaConfig
from qai.ai.db.llama_index.llama_creator import LLamaIndex
from qai.ai.prompt.prompt_maker import PromptMaker

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


class TestPromptMaker(unittest.TestCase):
    def test_local_prompt_maker_get_context_messages(self):
        company = "testcompany"
        with tempfile.TemporaryDirectory() as temp_dir:
            db_location = f"{temp_dir}/temp_index"
            idx = LLamaIndex(db_location=db_location, index_name=company)
            idx = idx.get_or_create_index(
                website_dir=f"{DATA_DIR}/test_website",
                needs_meta=False,
            )
            prompt_maker = PromptMaker(index=idx)
            rc = {}
            messages = prompt_maker.get_context_messages(
                "I am a test query", company_name=company, retrieval_config=rc
            )
            self.assertEqual(len(messages), 3)

    def test_local_prompt_maker(self):
        company = "testcompany"
        with tempfile.TemporaryDirectory() as temp_dir:
            db_location = f"{temp_dir}/temp_index"
            idx = LLamaIndex(db_location=db_location, index_name=company)
            idx = idx.get_or_create_index(
                website_dir=f"{DATA_DIR}/test_website",
                needs_meta=False,
            )
            # context = idx.get_context("test", company)
            prompt_maker = PromptMaker(index=idx)
            rc = {}
            messages = prompt_maker.make_prompt_messages(
                Query("I am a test query", use_context=True),
                company_name=company,
                retrieval_config=rc,
            )
            for msg in messages:
                print(msg["role"], msg["content"][:80].replace("\n", " "))
            self.assertEqual(len(messages), 5)


if __name__ == "__main__":
    test_name = "test_local_prompt_maker_get_context_messages"
    if test_name:
        suite = unittest.TestSuite()
        suite.addTest(TestPromptMaker(test_name))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
