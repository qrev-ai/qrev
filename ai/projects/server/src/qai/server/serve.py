import uuid
from pprint import pformat

from flask import jsonify, request
from flask_pydantic import validate
from pi_log import logs

from qai.server import VERSION, create_app
from qai.server.config import cfg
from qai.server.mock import mockable

from qai.server.models.models import ResearchFromListModel

## app should be created before importing other modules that require cfg
app = create_app(cfg)

from qai.server.tools.security import token_required

log = logs.getLogger(__name__)
logs.set_app_level("debug")


@app.route("/heartbeat", methods=["GET", "POST"])
def heartbeat():
    log.debug(f"serve::heartbeat")
    return jsonify({"status": "OK"}), 200


@app.route("/set_config", methods=["GET", "POST"])
@token_required
def set_config(key: str, value: str):
    """
    Set a configuration value
    """
    in_data = request.get_json()
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


@app.route("/campaign", methods=["GET", "POST"])
@mockable(ResearchFromListModel)
@validate(body=ResearchFromListModel)
def research_from_list():
    model = ResearchFromListModel(**request.get_json())


# @app.route("/campaign", methods=["GET", "POST"])
# @mockable(CampaignInputModel)
# @validate(body=CampaignInputModel)
# @token_required
# def campaign():
#     """
#     Do a campaign query
#     """
#     model = CampaignInputModel(**request.get_json())
#     log.debug(f"campaign() : model={model}")
#     if not model.id:
#         model.id = uuid.uuid4()

#     agent: CampaignAgent
#     if model.user_id in chat_session:
#         agent = chat_session[model.user_id]
#     else:
#         agent = CampaignAgent.create(**model.to_params())

#     if model.uploaded_data:
#         ## convert list of dict to dict of dict
#         uploaded_data = {d.get("id", uuid.uuid4()): d for d in model.uploaded_data}
#         agent.people = uploaded_data
#     response: CampaignResponse = agent.chat(model.query)
#     js = {}
#     js["actions"] = [
#         {
#             "action": "text",
#             "response": response.response,
#         }
#     ]
#     if response.emails:
#         for em in response.emails:
#             e_js = em.dict()
#             e_js.update(
#                 {
#                     "type": "email_sequence_draft",
#                     "sequence_id": response.sequence_id,
#                     "title": em.subject,
#                 }
#             )
#             js["actions"].append(e_js)

#     return jsonify(js), 200

