import os

try:
    import projects.scraper.src.scraper as scraper
except ImportError:
    import os
    import sys

    sys.path.append(os.getcwd())

from qai.scraper.scrapers.scraper import Scraper
from qai.scraper.scrapers.stealthscraper import StealthScraper


def get_scraper(
    stealth: bool = False,
) -> Scraper:
    s = StealthScraper() if stealth else Scraper()
    return s
