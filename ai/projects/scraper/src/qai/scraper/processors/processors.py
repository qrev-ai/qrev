import os
import re
from dataclasses import dataclass, fields
from typing import Any, ClassVar, List, Tuple, Dict

import ftfy
import pandas as pd
import validators
from bs4 import BeautifulSoup

from qai.scraper.scrapers.scraper import Scraper
from qai.scraper.utils.bs_utils import base_url, clean_soup
from qai.scraper.utils.bs_utils import make_soup as bs_util_make_soup
from qai.scraper.utils.bs_utils import url_with_path
from qai.core import Meta


@dataclass(init=False)
class Processor:
    name: str = None
    meta: Meta = None
    default_parser: str = "lxml"

    def __post_init__(self):
        if self.name is None:
            self.name = self.__class__.__name__

    def __call__(
        self, soup: BeautifulSoup, instance_info: dict[str, Any] = None, **kwargs
    ) -> BeautifulSoup:
        return self.process(soup, instance_info=instance_info, **kwargs)

    @classmethod
    def acceptable_fields(cls) -> set[str]:
        return set([f.name for f in fields(cls)])

    def make_soup(self, html_str_or_path_or_fp: str, default_parser: str = "lxml") -> BeautifulSoup:
        return bs_util_make_soup(html_str_or_path_or_fp, default_parser=default_parser)

    def process(
        self, soup: BeautifulSoup, instance_info: dict[str, Any] = None, **kwargs
    ) -> BeautifulSoup:
        ...
