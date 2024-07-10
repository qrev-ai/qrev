import pytest
from qai.ai import Query
from qai.ai.frameworks.openai.llm import OpenAILLM
from qai.ai.mock.mock import MockLLMClient

@pytest.fixture
def chatbot():
    client = MockLLMClient()
    cb = OpenAILLM(config={"name": "mock-model-1.0"}, client=client)
    return cb

def test_chatbot_mock_query_obj(chatbot):
    q = Query("What is the capital of France?")
    query_result = chatbot.query(q, params={"response": "Paris"})
    assert query_result.response == "Paris"

def test_chatbot_mock_str_query(chatbot):
    q = "What is the capital of France?"
    query_result = chatbot.query(q, params={"response": "Paris"})
    assert query_result.response == "Paris"

def test_chatbot_mock_query_obj_messages(chatbot):
    q = "What is the capital of France?"
    query_result = chatbot.query(q, params={"response": "Paris"})
    assert query_result.response == "Paris"

if __name__ == "__main__":
    pytest.main([__file__,"-W", "ignore:Module already imported:pytest.PytestWarning"])