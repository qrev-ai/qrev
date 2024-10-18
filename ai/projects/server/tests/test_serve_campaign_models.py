import json
import os
import unittest
from pathlib import Path

import pytest
from pydantic import ValidationError

from qai.server import ROOT_DIR
from qai.server.models.campaign.create_campaign import (
    Action,
    Conversation,
    CreateCampaignRequestModel,
    CreateCampaignResponseModel,
    EmailSequenceDraftAction,
    ListAction,
)

PROJECT_DIR = Path(ROOT_DIR).parent.parent.parent
REQUESTS_DIR = os.path.join(PROJECT_DIR, "tests", "examples", "requests")


def load_json_file(filename):
    with open(os.path.join(REQUESTS_DIR, filename)) as f:
        return json.load(f)


def test_merged_json_model():
    data = load_json_file("campaign_request.json")  # Assuming you have this file

    # Test that the model can be created from the JSON data
    model = CreateCampaignRequestModel.model_validate(data)
    assert model is not None

    # Test specific fields to ensure they're correctly parsed
    assert (
        model.query
        == "create a campaign using prospects mentioned in the uploaded CSV with 2 steps"
    )
    assert model.company_id == "652a31a0a7e0abdf1796b9bf"
    assert model.user_id == "65269526e7e5e7f1d991e9f0"

    # Test nested structures
    assert len(model.uploaded_data) == 2
    assert model.uploaded_data[0].email == "exuser@gmail.com"

    # Test optional fields
    assert model.conversation is None or isinstance(model.conversation, Conversation)

    # Test that the model can be converted back to a dict
    model_dict = model.model_dump()
    assert isinstance(model_dict, dict)


def test_invalid_data():
    invalid_data = {
        "query": "Invalid query",
        # Missing required fields
    }

    with pytest.raises(ValidationError):
        CreateCampaignRequestModel.model_validate(invalid_data)


def test_sender_company():
    data = load_json_file("campaign_request.json")
    model = CreateCampaignRequestModel.model_validate(data)

    assert model.sender_company.name == "My company"
    assert str(model.sender_company.website_url) == "http://example.com"


def test_default_configurations():
    data = load_json_file("campaign_request.json")
    model = CreateCampaignRequestModel.model_validate(data)

    assert len(model.default_configurations.exclude_domains) == 2
    assert len(model.default_configurations.sequence_steps_template) == 3
    assert model.default_configurations.sequence_steps_template[0].type == "ai_generated_email"


def test_create_campaign_response_model():
    data = load_json_file("campaign_response.json")
    model = CreateCampaignResponseModel.model_validate(data)

    assert len(model.actions) == 2
    assert isinstance(model.actions[0], ListAction)
    assert isinstance(model.actions[1], EmailSequenceDraftAction)


def test_list_action():
    data = load_json_file("campaign_response.json")
    model = CreateCampaignResponseModel.model_validate(data)
    list_action = model.actions[0]

    assert isinstance(list_action, ListAction)
    assert list_action.type == "list"
    assert list_action.title == "Here are some of the people:"
    assert len(list_action.values) == 2
    assert list_action.values[0].name == "John Doe"
    assert list_action.values[0].email == "johndoe@gmail.com"


def test_email_sequence_draft_action():
    data = load_json_file("campaign_response.json")
    model = CreateCampaignResponseModel.model_validate(data)
    email_action = model.actions[1]

    assert isinstance(email_action, EmailSequenceDraftAction)
    assert email_action.type == "email_sequence_draft"
    assert email_action.subject == "Exclusive Christmas Offer: 15% Off until Jan 2, 2024!"
    assert email_action.sequence.name == "New year 20% offer campaign"
    assert len(email_action.sequence.steps) == 2


if __name__ == "__main__":
    pytest.main([__file__])
