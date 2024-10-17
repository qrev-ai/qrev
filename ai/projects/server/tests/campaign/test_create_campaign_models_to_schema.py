import json
import os
import unittest
from pathlib import Path

import pytest
from pydantic import ValidationError
from qai.schema.models.outreach.campaign_model import (
    CampaignOptions,
    DataSource,
    EnrichmentSource,
    ExcludeOptions,
    Outreach,
    OutreachType,
)
from qai.schema.models.outreach.email import (
    EmailGeneratorSettings,
    Generation,
    Rule,
    Step,
)

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


def transform_outreach_data(input_data):
    transformed_steps = []
    for index, step in enumerate(input_data["steps"], start=1):
        transformed_step = {
            "order": index,
            "name": f"Step {index}",
            "email_generation": {
                "model": "claude-3-haiku-20240307",  # You might want to make this configurable
                "generation": {},
                "scoring": {},
                "email_settings": {},
            },
        }

        if step["type"] == "ai_generated_email":
            transformed_step["email_generation"]["generation"] = {
                "system_prompt": "",  # Add default or derive from input if available
                "user_prompt": "",  # Add default or derive from input if available
                "rules": [],  # Add default rules or derive from input if available
            }
        elif step["type"] == "fixed_email":
            transformed_step["email_fixed_text"] = {
                "subject": "",  # Add default or derive from input if available
                "body": "",  # Add default or derive from input if available
                "email_settings": {},
            }

        transformed_steps.append(transformed_step)

    return {
        "overwrite_existing": input_data.get("overwrite_existing", False),
        "email_settings": {},  # Add default settings or derive from input if available
        "steps": transformed_steps,
    }


# Usage
input_data = {
    "steps": [
        {"type": "ai_generated_email", "time_of_dispatch": {"value": 1, "time_unit": "day"}},
        {"type": "ai_generated_email", "time_of_dispatch": {"value": 3, "time_unit": "day"}},
        {"type": "ai_generated_email", "time_of_dispatch": {"value": 6, "time_unit": "day"}},
    ]
}

transformed_data = transform_outreach_data(input_data)
outreach = Outreach(**transformed_data)


def load_json_file(filename):
    with open(os.path.join(REQUESTS_DIR, filename)) as f:
        return json.load(f)


def convert_campaign_request_to_options(request: CreateCampaignRequestModel) -> CampaignOptions:
    # Create DataSource
    data_source = DataSource(
        source="uploaded_data", type="csv"  # Assuming the uploaded data is in CSV format
    )

    # Create EnrichmentSource
    # For this example, we'll assume no enrichment is needed
    enrichment_source = EnrichmentSource(type="none", include=False)

    # Create ExcludeOptions
    exclude_options = ExcludeOptions(
        domains=request.default_configurations.exclude_domains, emails=None, titles=None
    )

    transformed_outreach_data = transform_outreach_data(outreach_data)

    # Create Outreach
    outreach = Outreach(**transformed_outreach_data)

    # Create CampaignOptions
    campaign_options = CampaignOptions(
        name=f"Campaign for {request.sender_company.name}",
        sources=[data_source],
        exclude=exclude_options,
        enrichments=[enrichment_source],
        outreach=outreach,
    )

    return campaign_options


def test_models():
    data = load_json_file("campaign_request.json")

    # Test that the model can be created from the JSON data
    model = CreateCampaignRequestModel.model_validate(data)
    assert model is not None
    assert model.company_id == "652a31a0a7e0abdf1796b9bf"
    assert model.user_id == "65269526e7e5e7f1d991e9f0"
    qai_model_dict = model.to_params()
    co = convert_campaign_request_to_options(model)


if __name__ == "__main__":
    pytest.main([__file__])
