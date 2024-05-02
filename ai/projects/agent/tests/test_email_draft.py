import os
import unittest
from pathlib import Path

import speech_recognition as sr
from llama_index.core import (
    ChatPromptTemplate,
    Settings,
    SimpleDirectoryReader,
    VectorStoreIndex,
)
from llama_index.core.settings import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.huggingface import HuggingFaceLLM
from llama_index.llms.openai import OpenAI
from qai.ai.frameworks.openai.llm import OpenAILLM
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TextStreamer,
)

from qai.agent import ROOT_DIR, cfg
from qai.agent.agents.email import EmailModel, EmailToolSpec
from qai.agent.qaibot import QaiBot, QaiSession

# loads BAAI/bge-small-en
# embed_model = HuggingFaceEmbedding()

# loads BAAI/bge-small-en-v1.5
# quantization_config = BitsAndBytesConfig(
#     load_in_4bit=True,
#     # bnb_4bit_compute_dtype=torch.float16,
#     # bnb_4bit_quant_type="nf4",
#     # bnb_4bit_use_double_quant=True,
# )
# model_name="mistralai/Mistral-7B-Instruct-v0.1",
# tokenizer_name="mistralai/Mistral-7B-Instruct-v0.1",
# model_name="JosephusCheung/LL7M",
# tokenizer_name="JosephusCheung/LL7M",

embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
# Settings.llm = HuggingFaceLLM(
#     model_name="microsoft/phi-1_5",
#     tokenizer_name="microsoft/phi-1_5",
#     context_window=2048,
#     max_new_tokens=256,
#     # model_kwargs={"quantization_config": quantization_config},
#     generate_kwargs={"temperature": 0.0, "top_k": 50, "top_p": 0.95},
#     # messages_to_prompt=messages_to_prompt,
#     # completion_to_prompt=completion_to_prompt,
#     # device_map="cuda",
# )
Settings.llm = OpenAI(model="gpt-3.5-turbo", temperature=0.0)
PROJ_DIR = os.path.dirname(os.path.dirname(os.path.dirname(ROOT_DIR)))
db_config = {"connect_str": f"sqlite:///{PROJ_DIR}/scripts/qrev-org-intel.merged.sqlite3"}


class TestQaiBot(unittest.TestCase):
    def test_draft(self):
        from_person = {
            "name": "Maya",
            "email": "jane.doe@example.com",
            "title": "VP of Engineering",
        }
        to_person = {
            "name": "Zachary",
            "email": "zach.doe@example.com",
            "title": "Software Engineer",
        }
        from_company = {
            "name": "Example Corp",
            "url": "https://example.com",
            "industry": "Software and Consulting",
        }
        to_company = {
            "name": "Initech Corp",
            "url": "https://example.com",
            "industry": "Software",
        }
        draft_tool = EmailToolSpec(from_person=from_person, from_company=from_company)
        r = draft_tool.draft_email(
            to_person=to_person,
            to_company=to_company,
        )
        print(r.email)
        print(r.subject)
        print(r.body)
        self.assertEqual(type(r), EmailModel)


if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestQaiBot(testmethod))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
