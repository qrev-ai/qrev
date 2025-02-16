import os
from importlib.metadata import version
from typing import Optional

from dotenv import load_dotenv
from flask import Flask
from pi_conf import Config

load_dotenv()
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


class QaiFlask(Flask):
    def __init__(self, import_name: str, cfg: Config, *args, **kwargs):
        super().__init__(import_name=import_name, *args, **kwargs)
        self.init(cfg)

    def init(self, cfg: Config):
        self.website_2_id: Optional[dict[str, str]] = None
        self.id_2_website: Optional[dict[str, str]] = None
        self.cfg: Config = cfg
        if "aws" in self.cfg and self.cfg.aws.get("enabled", True):
            from qai.storage.aws.aws_history import AWSCompanyIds

            loader = AWSCompanyIds()
            self.website_2_id = loader.website_2_id
            self.id_2_website = loader.id_2_website

        if "website_name_map" in self.cfg:
            self.website_2_id = {}
            self.website_2_id.update(self.cfg.website_name_map)
            self.id_2_website = {v: k for k, v in self.website_2_id.items()}
        self._register_routes()

    def _register_routes(self):
        print("QaiFlask: Registering routes")
        """
        Register the blueprints (routes)
        """
        from .api.campaign_routes import bp as campaign_bp
        from .api.system_routes import bp as system_bp

        self.register_blueprint(campaign_bp)
        self.register_blueprint(system_bp)


def create_app(_cfg: Config) -> QaiFlask:
    return QaiFlask(__name__, cfg=_cfg)


try:
    VERSION = version("qai-server")
except Exception:
    VERSION = "0.0.0"
