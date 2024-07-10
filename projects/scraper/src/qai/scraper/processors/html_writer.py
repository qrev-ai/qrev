import os
from dataclasses import dataclass
from typing import Any

import ftfy
from bs4 import BeautifulSoup

from qai.scraper.filters.meta import InstanceInfo
from qai.scraper.processors.writer import Writer
from qai.core import MetaFile, MetaDir

@dataclass
class HTMLWriter(Writer):
    file_name: str = None
    prettify: bool = True

    def process(
        self, soup: BeautifulSoup, instance_info: InstanceInfo = None, **kwargs
    ) -> BeautifulSoup:
        group = self._append_and_modify_filename("html", instance_info=instance_info)
        if self.file_name is not None:
            with open(self.file_name, "w") as fp:
                html_s = ftfy.fix_text(str(soup.prettify()))
                soup = self.make_soup(html_s)
                html_s = str(soup.prettify())
                fp.write(html_s)
                if self.meta:
                    mf = MetaFile(path=self.file_name, metadata={"instance_info": instance_info})
                    if group:
                        group.add_file(mf)
                    else:
                        self.meta.add_file(mf)
        return soup
