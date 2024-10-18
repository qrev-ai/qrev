from flask import Blueprint, jsonify

bp = Blueprint('campaign', __name__)


@bp.route("/campaign", methods=["GET", "POST"])
def create_campaign():
    return jsonify({"status": "Campaign"}), 200