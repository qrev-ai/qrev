import logging
import os
from enum import StrEnum


from qai.chat.layers.chatbot import LayerBot
from qai.chat.layers.fact_table.factory import (
    TableType,
    get_fact_table,
)
from qai.chat.layers.llm.factory import get_chatbot as get_llm_chatbot


# def_file = f"{DATA_DIR}/companies/scrut/Scrut_IO_eb6a3f361c1e40febcddc49ae136e770_all_v1.csv"
def_file = ""

# chatbots: str, Chatbot = {}


class ChatbotTypes(StrEnum):
    LLM = "llm"
    TABLE = "table"
    LAYERED = "layered"


def get_or_create_chatbot(config, company_name: str, type: ChatbotTypes = None, **kwargs):
    """Returns a chatbot instance from a configuration file
    config should be a dictionary with keys fro "model", and whatever else is needed such as
    "model: {"name": "chatgpt-3.5-turbo"},
    "remove_after_question_mark": True,
    "mock": False,
    """
    return get_llm_chatbot(config, **kwargs)
    if company_name in chatbots:
        return chatbots[company_name]
    if not type:
        type = ChatbotTypes.LAYERED
    if type == ChatbotTypes.LAYERED:
        cb = LayerBot(config=config)
        if company_name == "scrut":
            if not os.path.exists(def_file):
                raise FileNotFoundError(f"Default File {def_file} not found")
            logging.debug(f"get_chabot: using ScrutChatbot, def_file {def_file}")
            table = get_fact_table(def_file, company_name, type=TableType.NORMAL)
            cb.layers.append(table)
            table = get_fact_table(def_file, company_name, type=TableType.NORMALIZED)
            cb.layers.append(table)
            table = get_fact_table(def_file, company_name, type=TableType.STEM)
            cb.layers.append(table)

        llm = get_llm_chatbot(config, **kwargs)
        cb.layers.append(llm)
        chatbots[company_name] = cb
        return cb
    raise NotImplementedError(f"Chatbot type {type} not implemented")
