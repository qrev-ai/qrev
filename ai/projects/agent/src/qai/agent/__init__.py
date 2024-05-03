import os
from importlib.metadata import version

from dotenv import load_dotenv
from pi_conf import AttrDict, Config, load_config

cfg = load_config("qai")
cfg.to_env()

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# class QaiFlask(Flask):
#     def __init__(self, *args, cfg=None, **kwargs):
#         super().__init__(*args, **kwargs)
#         self.init(cfg)

#     def init(self, cfg: Config):
#         self.website_2_id: dict[str, str] = None
#         self.id_2_website: dict[str, str] = None
#         self.cfg: Config = cfg

#         if "aws" in self.cfg and self.cfg.aws.get("enabled", True):
#             from qai.storage.aws.aws_history import AWSCompanyIds

#             loader = AWSCompanyIds()
#             self.website_2_id = loader.website_2_id
#             self.id_2_website = loader.id_2_website

#         if "website_name_map" in self.cfg:
#             self.website_2_id = {}
#             self.website_2_id.update(self.cfg.website_name_map)
#             self.id_2_website = {v: k for k, v in self.website_2_id.items()}


# def create_app(_cfg: Config) -> QaiFlask:
#     return QaiFlask(__name__, cfg=_cfg)

try:
    VERSION = version("qai-chat")
except Exception:
    VERSION = "0.0.0"
