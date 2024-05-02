import unittest
from dataclasses import dataclass
from typing import Dict, List

from qai.ai.mock.mock
from qai.ai.utils.token_utils import num_tokens

from qai.chat.layers.llm.chatbot import LLM, Chatbot
from qai.chat.layers.query import Query, QueryReturn
from qai.chat.prompt.config import PromptConfig

# set_log_level("debug")


class TestChatbot(unittest.TestCase):
    def test_chatbot_mock_query(self):
        cb = Chatbot(llm=MockLLM(config={}))

        query_result = cb.query(
            Query("What is the capital of France?", params={"response": "Paris"})
        )
        self.assertEqual(query_result.response, "Paris")

    def test_chatbot_mocked_query(self):
        cb = Chatbot(llm=MockLLM(config={}))
        query_result = cb.query(Query("Say this is a test!"))
        self.assertEqual(query_result.response, cb.llm.default_response)

    def test_chatbot_history(self):
        cb = Chatbot(llm=MockLLM(config={}))
        hist = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi"},
            {"role": "user", "content": "Hello2"},
            {"role": "assistant", "content": "Hi2"},
        ]
        cb.prompt_maker.get_history_messages(hist)
        query_result = cb.query(Query("Say this is a test!"))
        self.assertEqual(query_result.response, cb.llm.default_response)

    def test_system_message_from_config(self):
        pc = PromptConfig(**{"system_message": "yep"})
        cb = Chatbot(prompt_config=pc, llm=MockLLM(config={}))
        self.assertEqual(cb.prompt_maker.system_message, "yep")
        q = Query("Say this is a test!", prompt_config=pc)
        result = cb.query(q)
        self.assertEqual(result.query.prompt_config.system_message, "yep")

    def test_get_or_create_llm(self):
        from qai.chat.layers.factory import get_or_create_chatbot

        company_name = ""
        cb = get_or_create_chatbot(
            {"model": {"name": "MockLLM"}, "mock": True}, company_name=company_name
        )
        result = cb.query("Say this is a test!")
        self.assertEqual(result.response, "Mocked Response")

    def test_get_or_create_llm_dynamic_model(self):
        from qai.chat.layers.factory import get_or_create_chatbot

        model = "MockLLM"
        company_name = ""
        cb = get_or_create_chatbot(
            {"model": {"name": model}, "mock": True}, company_name=company_name
        )
        result = cb.query("Say this is a test!")
        self.assertEqual(result.response, "Mocked Response")
        self.assertEqual(result.model, model)
        model = "MockLLM2"
        query = Query("Say this is a test!", model=model)
        result = cb.query(query)
        self.assertEqual(result.model, model)


if __name__ == "__main__":
    testmethod = "test_chatbot_mock_query"
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestChatbot(testmethod))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
