import logging
import os
import random
import time
from hashlib import sha256
from urllib.parse import urlsplit

from bs4 import BeautifulSoup

from .scraper import Scraper

log = logging.getLogger(__name__)

# https://stackoverflow.com/questions/41721734/take-screenshot-of-full-page-with-selenium-python-with-chromedriver/52572919#52572919
class VisionScraper(Scraper):

    def get_and_save(self, url, dest_path, overwrite=False) -> str | None:
        save_name = self.url_to_local_name(url)

        log.debug(f"Scraper.get_and_save:{url}, {dest_path}")
        if not overwrite and os.path.exists(dest_path):
            log.debug(f"Scraper.get_and_save: skipping {url}, {save_name}")
            return None
        self.get(url)
        text = str(BeautifulSoup(self.driver.page_source, "lxml"))
        if "Security check" in text and "RayID" in text:
            log.error(f"Security Check Failed:{url}")
            return None
        if "Request unsuccessful. Incapsula incident ID" in text:
            log.error(f"Incapsula incident ID:{url}")
            return None
        with open(dest_path, "w") as fp:
            fp.write(self.driver.page_source)
        original_size = self.driver.get_window_size()
        required_width = self.driver.execute_script('return document.body.parentNode.scrollWidth')
        required_height = self.driver.execute_script('return document.body.parentNode.scrollHeight')
        self.driver.set_window_size(required_width, required_height)
        # driver.save_screenshot(path)  # has scrollbar
        self.driver.find_element_by_tag_name('body').screenshot(url)  # avoids scrollbar
        self.driver.set_window_size(original_size['width'], original_size['height'])        
        return dest_path
