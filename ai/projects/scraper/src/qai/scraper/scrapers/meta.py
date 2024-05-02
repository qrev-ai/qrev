import os
from dataclasses import dataclass

from qai.core import MetaObj, MetaUri


@dataclass(kw_only=True)
class WebObj(MetaUri):
    id: int
    scrape_time: str
    source_uri: str
    is_start_url: bool = None
    local_file: str = None
    category: str = "Unknown"
    depth: int = (-1,)
    type: str = "html_scrape"
    metadata: dict = None

    def path(self, subfolder: str):
        rootdir = os.path.dirname(os.path.dirname(self._uri))
        basename = os.path.basename(self._uri)
        return f"{rootdir}/{subfolder}/{basename}"


@dataclass
class ScrapeMeta(MetaObj):
    subfolder: str
    start_urls: list[str]
    dest_dir: str
    exclude_regexs: list[str]
    exclude_urls: list[str]
    exclude_parameters: bool
    max_depth: str
