import importlib
from logging import getLogger

log = getLogger(__name__)


def load_address_parser():
    log.debug("Loading external Address parsers")

    parsers = [
        ("postal", "qai.schema.parsers.address_parser_postal"),
        ("pyap", "qai.schema.parsers.address_parser_pyap"),
    ]

    for parser_name, module_path in parsers:
        try:
            module = importlib.import_module(module_path)
            parse_address = getattr(module, "parse_address")
            log.debug(f"Loaded {parser_name} Address parser")
            return parse_address
        except ImportError:
            log.debug(f"Failed to import {parser_name} parser")
        except AttributeError:
            log.debug(f"{parser_name} parser does not have parse_address function")
    else:
        log.error("No Address parser could be loaded")
        return None
