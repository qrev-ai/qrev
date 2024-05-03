from .chatbot import Chatbot
from qai.ai.mock.mock import MockLLMClient
import logging

def get_chatbot(config, **kwargs):
    """ Returns a chatbot instance from a configuration file
    config should be a dictionary with keys fro "model", and whatever else is needed such as
    "model: {"name": "chatgpt-3.5-turbo"},
    "remove_after_question_mark": True,
    "mock": False,

    """
    if kwargs.get("mock", False) or config.get("mock", False):
        logging.debug("get_chabot: using MockChatbot")
        return Chatbot(config, **kwargs, llm=MockLLMClient())
    else:
        logging.debug("get_chabot: using Chatbot")
        return Chatbot(config, **kwargs)
    