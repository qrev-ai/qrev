from dataclasses import dataclass
from typing import Any, Optional

from qai.core import Meta, MetaPath, MetaFile
# from qai.scraper.scrapers.meta import WebFile
from pydantic import BaseModel

class DirectoryInfo(BaseModel):
    in_folder: Optional[str] = None
    _meta: Optional[Meta] = None

class InstanceInfo(BaseModel):
    web_file: MetaFile = None
    _meta: Meta = None
    config: dict[str, Any] = None
    config_index: int = None
    directory_info: DirectoryInfo = None