from pprint import pformat

from flask import jsonify, request
from flask_pydantic import validate
from pi_log import logs
from qai.chat import VERSION, create_app
from qai.chat.config import cfg
from qai.chat.models import CompanyQueryModel

app = create_app(cfg)  ## app should be created before importing other modules


from qai.chat.chat import company_query
from qai.chat.db.chroma.chroma import Chroma
from qai.chat.server.security import requires, token_required

log = logs.getLogger(__name__)
logs.set_app_level("debug")
default_not_found_message = "Sorry, I don't know the answer to that question."


@app.route("/heartbeat", methods=["GET", "POST"])
@requires(["key", "value"])
def heartbeat():
    log.debug(f"serve::heartbeat")
    return jsonify({"status": "OK"}), 200


@app.route("/set_config", methods=["GET", "POST"])
@token_required
@requires(["key", "value"])
def set_config():
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
    logs.set_log_level(level)
    return jsonify({"status": "OK", "message": f"log level set to {level}"}), 200


@app.route("/version", methods=["GET", "POST"])
@token_required
def version():
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
@validate(body=CompanyQueryModel)
def company_chat():
    model = CompanyQueryModel(**request.get_json())
    model._fill_company_info(app.website_2_id, app.id_2_website)

    log.debug(f"serve::query, in_data={model}")

    if model.mock:
        return {"response": "Mocked Response"}, 200
    response = company_query(
        query=model.query,
        user_id=model.user_id,
        company_name=model.company_name,
        company_id=model.company_id,
    )
    response = {"response": str(response)}
    return jsonify(response), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
