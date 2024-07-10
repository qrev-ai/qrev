import os
import unittest

from mock_email_tool import MockEmailAgent, MockEmailToolSpec, sequence_dict
from pi_log import getLogger
import inspect
from qai.agent import ROOT_DIR
from qai.agent.agents.campaign_agent import CampaignOptions, CampaignAgent

log = getLogger(__name__, level="INFO", init_basic_config=True)
getLogger("qai.agent", level="DEBUG")
class TestCampaigns(unittest.TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()
    
    def test_campaign(self):
        sequence_id = f"seq_{inspect.stack()[0][3]}"
        co = CampaignOptions(
            allow_expansion=False,
            allow_replacement=False,
        )
        from_person = {
            "name": "Maya",
            "email": "jane.doe@example.com",
            "title": "VP of Engineering",
        }
        from_company = {
            "name": "Example Corp",
            "url": "https://example.com",
            "industry": "Software and Consulting",
        }
        to_persons = [
            {
                "name": "Zachary",
                "email": "zach.doe@example.com",
                "title": "Software Engineer",
            }
        ]
        ## convert list of dict to dict of dict
        to_people = {to_person["name"]: to_person for to_person in to_persons}

        
        ets = MockEmailToolSpec(from_person, from_company)
        ea: MockEmailAgent = MockEmailAgent.create(
            tools=ets.to_tool_list(), email_tool_spec_cls=MockEmailToolSpec
        )

        ca = CampaignAgent.create(
            from_person=from_person,
            from_company=from_company,
            people=to_people, 
            email_agent=ea, 
            campaign_options=co)
        response = ca.chat("Make me a campaign from these people")
        self.assertEqual(len(response.emails), 1)

if __name__ == "__main__":
    testmethod = "test_campaign"

    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestCampaigns(testmethod))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
