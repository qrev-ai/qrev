import logging
import os
import random
import re
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from logging import getLogger
from typing import Any, Set, Union, Optional
from urllib.parse import urlsplit

# import chromedriver_autoinstaller
import undetected_chromedriver as uc
from bs4 import BeautifulSoup
from qai.core import Meta, MetaBase, MetaDir, MetaFile, MetaPath

from qai.scraper.scrapers.meta import ScrapeMeta
from qai.scraper.utils.bs_utils import get_links, url_with_path
from selenium.webdriver.chrome.webdriver import WebDriver

log = getLogger(__name__)


# chromedriver_autoinstaller.install()
## Can check at https://useragentstring.com/, https://useragentstring.com/pages/Chrome/

user_agents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36",
]



class ScrapeSession(MetaBase):
    start_urls: list[str] = field(default_factory=list)
    dest_dir: str = None
    searched_urls: list[str] = field(default_factory=list)
    group: str = None
    meta: Meta = None
    submeta: dict[str, Any] = None


class Scraper:
    count = 0

    def __init__(self, options=None, driver=None, offline=False):
        self.driver = self._new_driver(quit=False, options=options, driver=driver)
        self.scrape_sessions = []
        self.offline = offline
        self.time_between_requests = 1
        self.time_jitter_between_requests = 1
        self.last_request_time = time.time()

        if self.driver is None:
            raise ValueError("Failed to create driver")

    def _new_driver(
        self,
        quit=True,
        options=None,
        driver=None,
        random_user_agent=False,
        version_main=None,  ## Specific version of chrome to use
    ) -> WebDriver:
        if quit:
            self.quit()
        if options is None:
            options = uc.ChromeOptions()
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_argument("--headless=True")
        if driver is None:
            try:
                driver = uc.Chrome(use_subprocess=True, options=options, version_main=version_main)
            except Exception as e:
                log.error(f"Failed to create driver, uc.version={uc.__version__}")
                log.error(e)

                return

            if random_user_agent:
                agent = random.choice(user_agents)
            else:
                agent = user_agents[0]
            driver.execute_cdp_cmd(
                "Network.setUserAgentOverride",
                {"userAgent": agent},
            )

        return driver

    def _scrape(
        self,
        url: str,
        dest_dir: str,
        current_depth: int = 0,
        max_depth: int = -1,
        overwrite: bool = False,
        exclude_urls: Set[str] = None,
        exclude_regexs: Set[str] = None,
        scrape_session: ScrapeSession = None,
        exclude_parameters: bool = True,
        submeta: MetaDir = None,
        meta: Meta = None,
    ) -> ScrapeSession:
        if exclude_regexs is None:
            exclude_regexs = set()
        if exclude_urls is None:
            exclude_urls = set()
        # urimeta = scrape_session.meta.get_uri_meta(scrape_session.group)

        if exclude_parameters:
            url = url_with_path(url)
        if exclude_urls is None:
            exclude_urls = set()
        if not isinstance(exclude_urls, set):
            exclude_urls = set(exclude_urls)
        if exclude_regexs is None:
            exclude_regexs = set()
        if not isinstance(exclude_regexs, set):
            exclude_regexs = set(exclude_regexs)
        # if scrape_session.meta is None:
        #     raise ValueError("ScrapeSession.meta is None")
        id = Scraper.count
        Scraper.count += 1
        if url in exclude_urls:
            # print("  " * current_depth, " --- excluded", url)
            return scrape_session
        for rgx in exclude_regexs:
            if re.search(rgx, url):
                print("  " * current_depth, " --- excluded based on match", url, rgx)
                return scrape_session
        # print("---- ", hex(id(exclude_urls)), exclude_urls)
        print(
            "  " * current_depth,
            # f"{current_depth}:{max_depth} Scraping: '{url}', url_with_path='{url_with_path(url)}'",
            f"{current_depth}:{max_depth} Scraping: '{url}'",
        )
        exclude_urls.add(url)
        hashed_name = self.url_to_local_name(url)

        local_file = f"{dest_dir}/{hashed_name}"
        # file_dest_dir = os.path.dirname(local_file)
        # dest_dir = os.path.dirname(local_file)
        os.makedirs(os.path.dirname(local_file), exist_ok=True)
        try:
            print("dest_dir", dest_dir, "hashed_name", hashed_name, "local_file", local_file)
            save_path = self.get_and_save(url, local_file, overwrite=overwrite)
            if save_path:
                # filemeta = MetaFile(path=local_file)
                fmeta = {
                    "hashed_name": hashed_name,
                    "source_uri":url,
                    "is_start_url": url in scrape_session.start_urls,
                    "depth": current_depth,
                    "type": "html_scrape",
                    "category":"Unknown"
                }
                filemeta = MetaFile(
                    path=local_file,
                    metadata=fmeta
                )
                submeta.add_file(filemeta)
        except Exception as e:
            import sys

            with open(f"errors.txt", "a") as fp:
                fp.write(url + "\n")
            traceback.print_exc(file=sys.stdout)
            # print(e)
            logging.error(f"Failed to scrape {url}")
            return scrape_session
        print( "  " * current_depth, " ---- ")
        
        if save_path:
            meta.save(overwrite=True)


        if max_depth and max_depth != -1 and current_depth + 1 >= max_depth:
            return scrape_session

        ## Recursively scrape
        links = get_links(
            url, local_file, exclude_parameters=exclude_parameters, depth=current_depth
        )
        for link in links:
            if exclude_urls and link in exclude_urls:
                continue
            ## TODO Need to add both specific link and base link
            self._scrape(
                url=link,
                dest_dir=dest_dir,
                current_depth=current_depth + 1,
                max_depth=max_depth,
                overwrite=overwrite,
                exclude_urls=exclude_urls,
                exclude_regexs=exclude_regexs,
                scrape_session=scrape_session,
                submeta=submeta,
                meta=meta
            )
        return scrape_session

    def scrape(
        self,
        urls: Union[str, list[str]],
        dest_dir: str | MetaDir,
        current_depth: int = 0,
        max_depth: int = 4,
        overwrite: bool = False,
        exclude_urls: Optional[set[str]] = None,
        exclude_regexs: Optional[set[str]] = None,
        scrape_session: Optional[ScrapeSession] = None,
        group: str = "raw",
        meta: Optional[Meta] = None,
        exclude_parameters: bool = True,
    ) -> ScrapeSession:
        if isinstance(urls, str):
            urls = [urls]
        urls = [url_with_path(u) for u in urls]
        if exclude_regexs is None:
            exclude_regexs = set()
        if exclude_urls is None:
            exclude_urls = set()
        if isinstance(dest_dir, MetaDir):
            dest_dir = str(dest_dir.path)
        if scrape_session is None:
            if meta is None:
                # meta = Meta.from_directory(os.path.dirname(dest_dir), create=True)
                meta = Meta.from_dir(os.path.dirname(dest_dir), create=True)
            scrape_session = ScrapeSession(start_urls=urls, dest_dir=dest_dir, group=group )
            self.scrape_sessions.append(scrape_session)
            meta.add_metadata("scrape_session", self.scrape_sessions)
            meta.save(overwrite=True)
        if meta is None:
            raise ValueError("Meta is None")
        # if scrape_session.meta is None:
        #     if meta:
        #         scrape_session.meta = meta
        #     else:
        #         raise ValueError("ScrapeSession.meta is None")

        # submeta = meta.get_group_meta(group)
        submeta = meta.get_dir(group, create=True)
        # if "scrape_session" not in submeta.metadata:
        #     submeta.metadata["scrape_session"] = []
        scrape_meta = ScrapeMeta(
            subfolder=scrape_session.group,
            start_urls=urls,
            dest_dir=dest_dir,
            exclude_regexs=list(exclude_regexs),
            exclude_urls=list(exclude_urls),
            exclude_parameters=exclude_parameters,
            max_depth=max_depth,
        )
        # submeta.metadata["scrape_session"].append(scrape_meta.model_dump(mode="json")) ##TODO
        # scrape_session.submeta = submeta
        submeta.add_metadata("scrape_session", scrape_meta)

        for url in urls:
            self._scrape(
                url,
                dest_dir=dest_dir,
                current_depth=current_depth,
                max_depth=max_depth,
                overwrite=overwrite,
                exclude_urls=exclude_urls,
                exclude_regexs=exclude_regexs,
                scrape_session=scrape_session,
                submeta=submeta,
                meta=meta
            )
        meta.save(overwrite=True)
        return scrape_session

    @staticmethod
    def base_url(url):
        split_url = urlsplit(url)
        return f"{split_url.scheme}://{split_url.netloc}"

    def get(self, url):
        d = self.driver.get(url)
        self.last_request_time = time.time()
        return d

    @staticmethod
    def url_to_local_name(url: str) -> str:
        """Create a semi human readable name for the url"""

        base_url = url_with_path(url)
        base_url = re.sub(r"https?(://)?", "", base_url)

        base_url = base_url.strip("/")
        return f"{base_url}/index.html"

    def _wait_if_needed(self):
        random_wait = random.randint(
            self.time_between_requests,
            self.time_between_requests + self.time_jitter_between_requests,
        )
        dif = (self.last_request_time + random_wait) - time.time()
        if dif > 0:
            time.sleep(dif)

    def get_and_save(self, url, dest_path, overwrite=False) -> str | None:
        save_name = self.url_to_local_name(url)

        logging.debug(f"Scraper.get_and_save:{url}, {dest_path}")
        if not overwrite and os.path.exists(dest_path):
            logging.debug(f"Scraper.get_and_save: skipping {url}, {save_name}")
            return None
        self.get(url)
        text = str(BeautifulSoup(self.driver.page_source, "lxml"))
        if "Security check" in text and "RayID" in text:
            logging.error(f"Security Check Failed:{url}")
            return None
        if "Request unsuccessful. Incapsula incident ID" in text:
            logging.error(f"Incapsula incident ID:{url}")
            return None
        with open(dest_path, "w") as fp:
            fp.write(self.driver.page_source)
        return dest_path

    def quit(self):
        self.driver.quit()
