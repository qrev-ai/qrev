print("src/qai/chat/config.py")
import builtins

from pi_conf import Config, load_config
from pydantic.dataclasses import dataclass

cfg = load_config("qai")

