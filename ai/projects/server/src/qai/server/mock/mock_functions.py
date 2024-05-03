from flask import jsonify, request
from qai.agent.basic import BasicQuery, QueryType

from qai.server.mock.mock_responses import (
    campaign_response,
    company_response,
    people_response,
)
from qai.server.models import CampaignInputModel


def campaign():
    model = CampaignInputModel(**request.get_json())
    basic_query = BasicQuery()
    result = basic_query.query(model.query)
    if result == QueryType.campaign:
        return jsonify(campaign_response), 200
    elif result == QueryType.company:
        return jsonify(company_response), 200
    elif result == QueryType.people:
        return jsonify(people_response), 200
    else:
        return jsonify(campaign_response), 200

def company_chat():
    return {"response": "Mocked Response"}, 200