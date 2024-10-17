import os
from importlib.metadata import version

from dotenv import load_dotenv
from pi_conf import load_config

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(ROOT_DIR, os.pardir, os.pardir, os.pardir))

cfg = load_config("qai")
cfg.to_env()
load_dotenv(os.path.join(PROJECT_DIR, ".env"))

try:
    VERSION = version("qai-chat")
except Exception:
    VERSION = "0.0.0"
