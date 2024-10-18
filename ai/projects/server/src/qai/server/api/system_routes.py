import logging
from typing import cast

from flask import Blueprint, current_app, jsonify, request

from qai.server import VERSION, QaiFlask
from qai.server.tools.security import token_required

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

bp = Blueprint("system", __name__, url_prefix="/system")


default_not_found_message = "Sorry, I don't know the answer to that question."


@bp.route("/heartbeat", methods=["GET", "POST"])
def heartbeat():
    log.debug(f"serve::heartbeat")
    return jsonify({"status": "OK"}), 200


@bp.route("/set_config", methods=["GET", "POST"])
@token_required
def set_config(key: str, value: str):
    """
    Set a configuration value
    """
    in_data = request.get_json()
    log.debug(f"serve::set_config, in_data={in_data}")

    old = current_app.cfg[key]
    current_app.cfg[key] = value
    return jsonify({"old": old, "new": value}), 200


@bp.route("/set_loglevel/<level>", methods=["GET", "POST"])
@token_required
def set_loglevel(level: str):
    """
    Set the log level
    Args:
        level: log level
    """
    logs.set_log_level(level)
    return jsonify({"status": "OK", "message": f"log level set to {level}"}), 200


@bp.route("/version", methods=["GET", "POST"])
@token_required
def version():
    """
    Get the version of the app
    """
    log.debug(f"serve::version")
    return jsonify({"config_version": current_app.cfg.version, "app_version": VERSION}), 200
    # return jsonify({"config_version": "v1", "app_version": VERSION}), 200
