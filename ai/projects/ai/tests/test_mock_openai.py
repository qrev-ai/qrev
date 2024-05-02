import unittest

from qai.ai import Query
from qai.ai.frameworks.openai.llm import OpenAILLM
from qai.ai.mock.mock import MockLLMClient


class TestChatbot(unittest.TestCase):
    def test_chatbot_mock_query_obj(self):
        client = MockLLMClient()
        cb = OpenAILLM(config={"name": "mock-model-1.0"}, client=client)
        q = Query("What is the capital of France?")
        print(q)
        query_result = cb.query(q, params={"response": "Paris"})
        self.assertEqual(query_result.response, "Paris")

    def test_chatbot_mock_str_query(self):
        client = MockLLMClient()
        cb = OpenAILLM(config={"name": "mock-model-1.0"}, client=client)
        q = "What is the capital of France?"
        query_result = cb.query(q, params={"response": "Paris"})
        self.assertEqual(query_result.response, "Paris")

    def test_chatbot_mock_query_obj_messages(self):
        client = MockLLMClient()
        cb = OpenAILLM(config={"name": "mock-model-1.0"}, client=client)
        q = "What is the capital of France?"
        query_result = cb.query(q, params={"response": "Paris"})
        self.assertEqual(query_result.response, "Paris")


if __name__ == "__main__":
    unittest.main()
