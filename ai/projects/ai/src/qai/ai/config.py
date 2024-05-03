import os

import pkg_resources
from pi_conf import Config

cfg = Config()

cfg["ROOT_DIR"] = os.path.abspath(os.path.dirname(os.path.abspath(__file__)))
cfg["DATA_DIR"] = os.path.abspath(os.path.join(cfg["ROOT_DIR"], "..", "data"))

try:
    VERSION = pkg_resources.get_distribution("qai-ai").version
    cfg["VERSION"] = VERSION
except pkg_resources.DistributionNotFound:
    VERSION = "0.0.0"
