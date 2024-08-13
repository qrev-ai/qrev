
from qai.core.meta import MetaBase


class ScrapeMeta(MetaBase):
    subfolder: str
    start_urls: list[str]
    dest_dir: str
    exclude_regexs: list[str]
    exclude_urls: list[str]
    exclude_parameters: bool
    max_depth: int
