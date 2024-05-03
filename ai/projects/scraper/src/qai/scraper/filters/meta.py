from dataclasses import dataclass
from typing import Any

from qai.core import Meta, MetaUri, MetaObj
from qai.scraper.scrapers.meta import WebObj

class DirectoryInfo(MetaObj):
    in_folder: str = None
    meta: Meta = None

@dataclass
class InstanceInfo(MetaUri):
    web_file: WebObj = None
    meta: Meta = None
    config: dict[str, Any] = None
    config_index: int = None
    directory_info: DirectoryInfo = None