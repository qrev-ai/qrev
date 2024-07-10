import json
import os
import unittest
from pathlib import Path

from qai.agent.agents.campaign_agent import CampaignAgent

from qai.server import ROOT_DIR
from qai.server.models import CampaignInputModel, CompanyChatbotModel

PROJECT_DIR = Path(ROOT_DIR).parent.parent.parent
REQUESTS_DIR = os.path.join(PROJECT_DIR, "examples", "requests")


class TestServeModels(unittest.TestCase):
    def test_campaign_model(self):
        with open(os.path.join(REQUESTS_DIR, "campaign.json")) as f:
            data = json.load(f)
        ## Test input params create a model
        m = CampaignInputModel.model_validate(data)
        self.assertIsNotNone(m)
        ## Test that the model can be converted and used to create a campaign
        params = m.to_params()

        agent = CampaignAgent.create(**params)
        self.assertIsNotNone(agent)

    def test_company_chatbot_model(self):
        """
        query: str,
        user_id: str,
        company_name: str,
        company_id: str,
        model: str = None,
        guid: str = None,
        model_cfg: dict = None,
        chroma_cfg: dict = None,

        """
        with open(os.path.join(REQUESTS_DIR, "company_chatbot.json")) as f:
            data = json.load(f)
        ## Test input params create a model
        m = CompanyChatbotModel.model_validate(data)
        self.assertIsNotNone(m)
        ## TODO - Fix this test
        # ## Test that the model can be converted and used to do a company_query
        # params = m.to_params()
        # func = create_autospec(company_query)
        # log.debug(func)
        # func(**params)


if __name__ == "__main__":
    test_name = ""
    if test_name:
        suite = unittest.TestSuite()
        suite.addTest(TestServeModels(test_name))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
