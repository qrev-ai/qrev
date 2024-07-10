from importlib.metadata import version

try:
    VERSION = version("qai-chat")
except Exception:
    VERSION = "0.0.0"
