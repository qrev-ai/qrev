import os
from importlib.metadata import version

from pi_conf import Config

cfg = Config()

cfg["ROOT_DIR"] = os.path.abspath(os.path.dirname(os.path.abspath(__file__)))
cfg["DATA_DIR"] = os.path.abspath(os.path.join(cfg["ROOT_DIR"], "..", "data"))

try:
    VERSION = version("qai-chat")
    cfg["VERSION"] = VERSION
except:
    VERSION = "0.0.0"
