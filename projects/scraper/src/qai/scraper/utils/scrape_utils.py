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

from qai.scraper.scrapers.stealthscraper import StealthScraper
from qai.scraper.scrapers.scraper import Scraper

default_exclude_regexes = set()
default_exclude_regexes.add(":.*@")
default_exclude_regexes.add("/ja-jp/")


def prep_scrap(
    site_name: str,
    urls: Iterable[str],
    base_dir: str = None,
    dest_dir: str = None,
    exclude_urls: Iterable[str] = None,
    exclude_regexs: Iterable[str] = None,    
    medata_loc: str = None,
    max_depth: int = 4,
    stealth=False,
):
    if exclude_urls is None:
        exclude_urls = set()
    if exclude_regexs is None:
        exclude_regexs = set()
    if base_dir is None:
        now_str = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        base_dir = f"~/data/websites/{site_name}/{now_str}"
    if dest_dir is None:
        dest_dir = os.path.expanduser(f"{base_dir}/raw")
    if medata_loc is None:
        medata_loc = os.path.expanduser(f"{base_dir}/metadata.csv")
    os.makedirs(base_dir, exist_ok=True)
    
    s = StealthScraper() if stealth else Scraper()
    
    exclude_regexs.add(":.*@")
    exclude_regexs.add("/ja-jp/")
    s.scrape(
        urls,
        dest_dir=dest_dir,
        metadata_loc=medata_loc,
        exclude_urls=exclude_urls,
        exclude_regexs=exclude_regexs,
        max_depth=max_depth,
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-name", type=str, required=True)
    ap.add_argument("--url", type=str, required=True)
    ap.add_argument("--max-depth", type=int, default=-1)
    ap.add_argument("--stealth", action="store_true", default=False)
    # import sys
    # sys.argv = ["", "--site-name", "cognite", "--url", "https://www.cognite.commailto:MRMartin@rockwellautomation.com/en-us/products/details.800T-2TAPW.html", "--max-depth", "-1"]
    args = ap.parse_args()
    extract(site_name=args.site_name, urls=[args.url], max_depth=args.max_depth, stealth=args.stealth)
