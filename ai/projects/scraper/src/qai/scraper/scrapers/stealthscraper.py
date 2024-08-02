import logging
import os
import random
import time
from hashlib import sha256
from urllib.parse import urlsplit

import undetected_chromedriver as uc
from bs4 import BeautifulSoup

from .scraper import Scraper

## Can check at https://useragentstring.com/, https://useragentstring.com/pages/Chrome/
user_agents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36",
]


class StealthScraper(Scraper):
    def __init__(self, options=None, driver=None):
        self.time_between_requests = 4
        self.time_jitter_between_requests = 6
        self.last_request_time = 0
        self.window_size = (1200, 800)
        self.window_size_range = (600, 600)
        self.window_pos = (400, 400)
        self.window_pos_range = (300, 300)
        super().__init__(options, driver)

    def _new_driver(
        self,
        quit=True,
        options=None,
        driver=None,
        random_user_agent=False,
        version_main=None,  ## Specific version of chrome to use
    ):
        if quit:
            self.quit()
        if options is None:
            options = uc.ChromeOptions()
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_argument("--headless=True")
        if driver is None:
            driver = uc.Chrome(use_subprocess=True, options=options, version_main=version_main)
            driver.execute_cdp_cmd(
                "Network.setUserAgentOverride",
                {"userAgent": random.choice(user_agents)},
            )
            driver.execute_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )
            driver.set_window_position(
                random.randint(
                    self.window_pos[0] - self.window_pos_range[0],
                    self.window_pos[0] + self.window_pos_range[0],
                ),
                random.randint(
                    self.window_pos[1] - self.window_pos_range[1],
                    self.window_pos[1] + self.window_pos_range[1],
                ),
            )
            driver.set_window_size(
                random.randint(
                    self.window_size[0] - self.window_size_range[0],
                    self.window_size[0] + self.window_size_range[0],
                ),
                random.randint(
                    self.window_size[1] - self.window_size_range[1],
                    self.window_size[1] + self.window_size_range[1],
                ),
            )
        self.driver = driver

    @staticmethod
    def base_url(url):
        split_url = urlsplit(url)
        return f"{split_url.scheme}://{split_url.netloc}"

    def get(self, url):
        self._wait_if_needed()
        self._new_driver()
        d = self.driver.get(url)
        self.last_request_time = time.time()
        return d

    def _wait_if_needed(self):
        random_wait = random.randint(
            self.time_between_requests,
            self.time_between_requests + self.time_jitter_between_requests,
        )
        dif = (self.last_request_time + random_wait) - time.time()
        if dif > 0:
            time.sleep(dif)

    def quit(self):
        self.driver.quit()
