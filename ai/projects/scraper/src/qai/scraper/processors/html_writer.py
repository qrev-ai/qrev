import os
from dataclasses import dataclass
from typing import Any

import ftfy
from bs4 import BeautifulSoup

from qai.scraper.filters.meta import InstanceInfo
from qai.scraper.processors.writer import Writer


@dataclass
class HTMLWriter(Writer):
    file_name: str = None
    prettify: bool = True

    def process(
        self, soup: BeautifulSoup, instance_info: InstanceInfo = None, **kwargs
    ) -> BeautifulSoup:
        self._append_and_modify_filename("html", instance_info=instance_info)
        if self.file_name is not None:
            print(f"Writing HTML to {self.file_name}")

            with open(self.file_name, "w") as fp:
                html_s = ftfy.fix_text(str(soup.prettify()))
                soup = self.make_soup(html_s)
                html_s = str(soup.prettify())
                fp.write(html_s)
        return soup
