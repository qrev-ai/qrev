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

from qai.core import Meta

from qai.scraper.scrapers.scraper import Scraper
from qai.scraper.scrapers.scraper_factory import get_scraper
from qai.scraper.scrapers.stealthscraper import StealthScraper

default_exclude_regexes = set()
default_exclude_regexes.add(":.*@")
default_exclude_regexes.add("/ja-jp/")


def extract(
    site_name: str = None,
    site_path: str = None,
    urls: Iterable[str] = None,
    meta: Meta = None,
    dest_subfolder: str = "raw",
    exclude_urls: Iterable[str] = None,
    exclude_regexs: Iterable[str] = None,
    max_depth: int = 4,
    stealth=False,
    subfolder="raw",
    continue_scrape: bool = False,
):
    if meta is None:
        if site_name:
            site_path = f"~/data/websites/{site_name}"
        # base_dir = f"~/data/websites/{site_name}"
        print("Creating at ", site_path)
        meta = Meta.from_dir(site_path, create=True)

    if exclude_regexs is None:
        exclude_regexs = default_exclude_regexes.copy()

    scraper = get_scraper(stealth=stealth)

    scraper.scrape(
        urls,
        # dest_dir=meta.get_group(dest_subfolder, create=True),
        dest_dir=meta.get_dir(subfolder, create=True),
        exclude_urls=exclude_urls,
        exclude_regexs=exclude_regexs,
        max_depth=max_depth,
        group=subfolder,
        meta=meta,
    )


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
