import os
import unittest
from pathlib import Path

import speech_recognition as sr
from openai import OpenAI
from qai.ai.frameworks.openai.llm import OpenAILLM

from qai.agent import ROOT_DIR, cfg
from qai.agent.qaibot import QaiBot, QaiSession

PROJ_DIR = os.path.dirname(os.path.dirname(os.path.dirname(ROOT_DIR)))
db_config = {"connect_str": f"sqlite:///{PROJ_DIR}/scripts/qrev-org-intel.merged.sqlite3"}
model_config = {
    "name": "gpt-3.5-turbo-0125",
}


class TestQaiBot(unittest.TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()

    def test_email_draft(self):
        to_persons = [
            {
                "name": "Maya",
                "email": "maya@example.com",
                "title": "VP of Engineering",
            },
            {
                "name": "John",
                "email": "John@example.com",
                "title": "CEO",
            },
        ]

        from_person = {
            "name": "Oliver",
            "email": "Oliver@example.com",
            "title": "VP of Sales",
        }
        from_company = {
            "name": "QRev",
            "url": "https://qrev.ai",
            "industry": "Software and Consulting",
        }

        to_persons_dict = {d["name"]: d for d in to_persons}
        from qai.agent.agents.campaign.campaign import CampaignAgent

        agent: CampaignAgent = CampaignAgent.create(
            people=to_persons_dict,
            companies={},
            on_complete_emails_url="localhost:8000/emails",
            # on_complete_emails_method="POST",
            from_company=from_company,
            from_person=from_person,
        )
        emails = agent.email_agent.create_emails(
            sequence_id="test_sequence_id_2",
            to_people=to_persons_dict,
            from_company=from_company,
            from_person=from_person,
            use_async_on=1,
        )


if __name__ == "__main__":
    testmethod = "test_email_draft"
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestQaiBot(testmethod))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
