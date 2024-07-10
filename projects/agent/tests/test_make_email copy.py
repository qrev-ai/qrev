import json
import os
from collections import defaultdict

from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.program import LLMTextCompletionProgram
from llama_index.llms.openai import OpenAI
from pi_conf import load_config
from pydantic import BaseModel, Field
import pandas as pd
from dataclasses import dataclass
from pydantic import create_model


cfg = load_config("qrev-ai")
cfg.to_env()


with open(os.path.expanduser("~/data/bevy/combined.json"), "r") as f:
    combined_json = json.load(f)
len(combined_json)

intro_personalization = (
    "Personalized first line for the email based on what you know about the job,"
    " company, and person. This comes after the greeting. "
    "Example: It’s evident that you care a lot "
    "about community and go the last mile to build a beautiful community at {to_company} "
)

template = """Hi John,

<intro_personalization: description here>

<pain_agitation>

and Good day!

Companies like Google and Salesforce run and seamlessly scale their communities worldwide with Bevy. 

We can do the same for {to_company}. Worth a chat? 

Best, 
Sunny

PS: In case you don’t want to hear from me again, please let me know here
"""










@dataclass
class EmailMaker:

    def __init__(self, template):
        pass

    # def __init__(self, from_person : dict, from_company : dict, to_person : dict, to_company : dict):
    #     self.from_person = from_person
    #     self.from_company = from_company
    #     self.to_person = to_person
    #     self.to_company = to_company
