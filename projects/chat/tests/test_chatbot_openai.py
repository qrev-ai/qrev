import unittest

from qai.chat.layers.llm.chatbot import Chatbot
from qai.chat.layers.query import Query


class TestOpenAIChatbot(unittest.TestCase):
    def test_chatbot_openai_query(self):
        model_params = {
            "name": "gpt-3.5-turbo",
            "temperature": 0.0,
        }
        cb = Chatbot(config={"model": model_params})
        prompt_config = {"system_message": ""}
        q = Query("Say this is a test!", prompt_config=prompt_config)
        query_result = cb.query(q)
        self.assertIn(query_result.response, ["This is a test!", "This is a test."])


if __name__ == "__main__":
    unittest.main()
