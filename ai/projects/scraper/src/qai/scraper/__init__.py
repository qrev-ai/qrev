import os

# import pkg_resources
from pi_conf import load_config

from qai.scraper.filters.filter import Filter as Filter
from qai.scraper.scrapers.scraper import Scraper as Scraper

cfg = load_config("qai-scraper")
cfg.to_env(ignore_complications=True)

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "..", "data")
PARSE_CONFIG_DIR = os.path.join(ROOT_DIR, "..", "parse_configs")
try:
    import importlib.metadata
    # VERSION = pkg_resources.get_distribution("qai.scraper").version
    VERSION = importlib.metadata.version("qai.scraper")
except Exception:
    VERSION = "0.0.0"
