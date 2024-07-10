import re
from dataclasses import dataclass
from typing import Any

import ftfy
from bs4 import BeautifulSoup, NavigableString, Tag

from qai.scraper.processors.tag_denester import TagDenester
from qai.scraper.utils.bs_utils import sanitize as sanitize_html_str

from .processors import Processor


@dataclass
class ValueConverter(Processor):
    value_from_attributes: list[str] = None

    def process(
        self, soup: BeautifulSoup, instance_info: dict[str, Any] = None
    ) -> BeautifulSoup:
        ## change values if they are dynamically set in attributes
        if self.value_from_attributes:
            attrs = set(self.value_from_attributes)
            for tag in soup.find_all(lambda t: len(t.attrs) and attrs.intersection(t.attrs.keys())):
                for a in attrs.intersection(tag.attrs.keys()):
                    tag.string = tag.attrs[a]
        return soup
