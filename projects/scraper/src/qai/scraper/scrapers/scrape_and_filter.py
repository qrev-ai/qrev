import os
import tomllib as toml
from typing import Iterable

from qai.core import Meta
from qai.scraper.filters.filter import MultiFilter
from qai.scraper.scrapers.scraper import Scraper

filter_cfg = """
[[pipeline]]
in_folder = "raw"
out_folder = "simplified"
categories = ["general"]
pipeline = ["Remove", "Simplify", "HtmlWriter", "MarkdownWriter"]

[[processors]]
name = "Remove"
header = true
footer = true
javascript = true
css = true
style = true
images = true
empty = true
meta = true
document = true
buttons = true
p_in_a = true
classes = ["home-header", "home-footer", "main-header", "main-footer"]

[[processors]]
name = "Simplify"
unwrap_a = false
sanitize = false

[[processors]]
name = "HtmlWriter"
out_folder = "simplified_html"

[[processors]]
name = "MarkdownWriter"
out_folder = "simplified_md"
"""


class ScraperFilter:
    def __init__(
        self,
        meta: Meta = None,
        webdir: str = None,
        within_seconds: int = 0,
        resume: bool = False,
        scraper: Scraper = None,
        filter: MultiFilter = None,
    ):
        self.scraper = scraper
        self.filter = filter
        self.meta = meta
        if self.meta is None:
            if not webdir:
                raise ValueError("Either meta or webdir must be provided.")
            if resume and os.path.exists(webdir):
                print(f"Directory {webdir} already exists. Using existing data.")
                meta = Meta.from_most_recent(webdir)
            else:
                print(f"Creating new meta data in {webdir}.")
                meta = Meta.create_most_recent(webdir)
        if self.filter is None:
            filter_cfgs = [
                toml.loads(filter_cfg),
            ]
            self.filter = MultiFilter(filter_cfgs, meta=meta)
        if self.scraper is None:
            self.scraper = Scraper()

    def scrape_and_filter(
        self,
        urls: Iterable[str],
        dest_subfolder: str = "raw",
        exclude_urls: Iterable[str] = None,
        exclude_regexs: Iterable[str] = None,
        max_depth: int = 4,
        subfolder="raw",
    ):
        dest_dir = self.meta.get_group(dest_subfolder, create=True)

        self.scraper.scrape(
            urls,
            dest_dir=dest_dir,
            exclude_urls=exclude_urls,
            exclude_regexs=exclude_regexs,
            max_depth=max_depth,
            group=subfolder,
            meta=self.meta,
        )
        self.filter.process_directory(self.meta.get_group(dest_subfolder))
