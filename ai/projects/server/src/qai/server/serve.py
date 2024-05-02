import uuid
from pprint import pformat

from flask import jsonify, request
from flask_pydantic import validate
from pi_log import logs
from qai.agent.agents.campaign.campaign import (
    CampaignAgent,
    CampaignResponse,
    CampaignToolSpec,
)
from qai.chat.chat import company_query
from qai.chat.db.chroma.chroma import Chroma

from qai.server import VERSION, create_app
from qai.server.config import cfg
from qai.server.models import CampaignInputModel, CompanyChatbotModel

app = create_app(cfg)  ## app should be created before importing other modules

from qai.server.tools.security import requires, token_required

log = logs.getLogger(__name__)
logs.set_app_level("debug")
default_not_found_message = "Sorry, I don't know the answer to that question."

chat_session = {}


@app.route("/heartbeat", methods=["GET", "POST"])
def heartbeat():
    log.debug(f"serve::heartbeat")
    return jsonify({"status": "OK"}), 200


@app.route("/set_config", methods=["GET", "POST"])
@token_required
@requires(["key", "value"])
def set_config():
    """
    Set a configuration value
    """
    in_data = request.get_json()
    key = in_data.get("key")
    value = in_data.get("value")
    log.debug(f"serve::set_config, in_data={in_data}")
    old = app.cfg[key]
    app.cfg[key] = value
    return jsonify({"old": old, "new": value}), 200


@app.route("/set_loglevel/<level>", methods=["GET", "POST"])
@token_required
def set_loglevel(level: str):
    """
    Set the log level
    Args:
        level: log level
    """
    logs.set_log_level(level)
    return jsonify({"status": "OK", "message": f"log level set to {level}"}), 200


@app.route("/version", methods=["GET", "POST"])
@token_required
def version():
    """
    Get the version of the app
    """
    log.debug(f"serve::version")
    return jsonify({"config_version": app.cfg.version, "app_version": VERSION}), 200


@app.route("/get_collection", methods=["GET", "POST"])
@token_required
def chroma():
    in_data = request.get_json()
    log.debug(f"serve::chroma, in_data={in_data}, chroma.cfg={app.cfg.chroma}")
    c = Chroma(app.cfg.chroma)
    col = c.get_collection(in_data["collection_name"])
    count = col.count() if col else -1
    meta = col.metadata if col else {}
    log.debug(f"serve::chroma count={count}, metadata={meta}")
    return jsonify({"count": count, "in_data": in_data, "metadata": meta}), 200


@app.route("/config", methods=["GET", "POST"])
@token_required
def config():
    log.debug(f"serve::config \n{pformat(app.cfg)}")
    return (
        jsonify(
            {
                "config": app.cfg,
            }
        ),
        200,
    )


def _debug_query(in_data, guid: str, query: str, company_name: str):
    query = query[36:].strip().lstrip(":").strip()

    in_data.pop("query")
    d = {
        "app_version": VERSION,
        "config_version": app.cfg.version,
        "build_time": app.cfg.build_time,
        "query": query,
        "in_data": in_data,
    }
    in_data["response"] = pformat(d)
    return jsonify(in_data), 200


@app.route("/", methods=["GET", "POST"])
@token_required
@validate(body=CompanyChatbotModel)
def company_chat():
    """
    Query the company chatbot
    """
    model = CompanyChatbotModel(**request.get_json())

    log.debug(f"serve::query, in_data={model}")

    if model.mock:
        return {"response": "Mocked Response"}, 200
    try:
        response = company_query(
            query=model.query,
            user_id=model.user_id,
            company_name=model.company_name,
            company_id=model.company_id,
            model_cfg=app.cfg.model,
            chroma_cfg=app.cfg.chroma,
        )
    except Exception as e:
        return {"response": str(e)}, 500
    response = {"response": str(response)}
    return jsonify(response), 200


@app.route("/campaign", methods=["GET", "POST"])
@token_required
@validate(body=CampaignInputModel)
def campaign():
    """
    Do a campaign query
    """
    model = CampaignInputModel(**request.get_json())
    log.debug(f"#### campaign : model={model}", flush=True)
    if not model.id:
        model.id = uuid.uuid4().hex
    from qai.agent.basic import BasicQuery, QueryType

    from qai.server.mock_responses import (
        campaign_response,
        company_response,
        people_response,
    )

    if model.mock:
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
    else:
        agent : CampaignAgent 
        if model.user_id in chat_session:
            agent = chat_session[model.user_id]
        else:

            agent = CampaignAgent.create(**model.to_params())
            
            # chat_session[model.user_id] = agent ### TODO
        if model.uploaded_data:
            ## convert list of dict to dict of dict
            uploaded_data = {d["name"]: d for d in model.uploaded_data}
            agent.people = uploaded_data
        response: CampaignResponse = agent.chat(model.query)
        js = {}
        js["actions"] = [
            {
                "action": "text",
                "response": response.response,
            }
        ]
        if response.emails:
            emails = []
            for em in response.emails:

                e_js = em.dict()
                e_js.update(
                    {"type": "email_sequence_draft", "sequence_id": model.id, "title": em.subject}
                )
                js["actions"].append(e_js)

        return jsonify(js), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
