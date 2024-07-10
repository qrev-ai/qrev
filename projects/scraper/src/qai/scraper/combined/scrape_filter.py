import argparse
import os
from datetime import datetime
from typing import Iterable, Optional

try:
    import qai.scraper
except ImportError:
    import os
    import sys

    sys.path.append(os.getcwd())

import os
import tomllib as toml

import pandas as pd
from qai.core import Meta

from qai.scraper import Scraper
from qai.scraper.filters.basic_filter import filter_cfg
from qai.scraper.filters.filter import MultiFilter
from qai.scraper.scrapers.scraper import Scraper
from qai.scraper.scrapers.scraper_factory import get_scraper
from qai.scraper.scrapers.stealthscraper import StealthScraper


def scrape_filter(
    company,
    urls: str | list[str],
    web_dir: str,
    max_depth=1,
    filter_config=None,
    skip_if_existing: bool = True,
):
    if isinstance(urls, str):
        urls = [urls]
    if filter_config is None:
        filter_config = filter_cfg
    if skip_if_existing and os.path.exists(web_dir):
        print(f"Skipping {company} as it already exists")
        return
    # webdir = os.path.expanduser(f"~/data/websites4/{company}")
    meta = Meta.from_dir(web_dir, create=True, set_save_location=True)
    dest_dir = meta.get_dir("raw", create=True)
    ## prepend http if not present
    urls = [url if url.startswith("http") else f"https://{url}" for url in urls]
    scraper = Scraper()
    scraper.scrape(urls, dest_dir, max_depth=max_depth, meta=meta)
    filter = MultiFilter([filter_config], meta=meta)
    filter.process_directory(in_group="raw")
    meta.save(overwrite=True)
