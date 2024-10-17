import argparse
import os
from datetime import datetime
from typing import Iterable

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

default_exclude_regexes = set()
default_exclude_regexes.add(":.*@")
default_exclude_regexes.add("/ja-jp/")


def scrape_filter(company, urls: str | list[str], dest_dir: str, max_depth=1, filter_config=None):
    if isinstance(urls, str):
        urls = [urls]
    if filter_config is None:
        filter_config = filter_cfg
    # webdir = os.path.expanduser(f"~/data/websites4/{company}")
    meta = Meta.from_dir(dest_dir, create=True, set_save_location=True)
    dest_dir = meta.get_dir("raw", create=True)
    for url in urls:
        if not url.startswith("http"):
            url = f"https://{url}"
    scraper = Scraper()
    scraper.scrape(urls, dest_dir, max_depth=max_depth, meta=meta)
    filter = MultiFilter([filter_config], meta=meta)
    filter.process_directory(in_group="raw")
    meta.save(overwrite=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-name", type=str, required=True)
    ap.add_argument("--url", type=str, required=True)
    ap.add_argument("--max-depth", type=int, default=-1)
    ap.add_argument("--stealth", action="store_true", default=False)
    ap.add_argument("--resume", action="store_true", default=False)
    import sys

    args = ap.parse_args()
    extract(
        site_name=args.site_name,
        urls=[args.url],
        max_depth=args.max_depth,
        stealth=args.stealth,
        continue_scrape=args.resume,
    )
