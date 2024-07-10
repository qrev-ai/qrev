import os
from dataclasses import dataclass
from typing import Any, Tuple

import validators
from bs4 import BeautifulSoup

from qai.scraper.filters.meta import InstanceInfo
from qai.scraper.processors.writer import Writer
from qai.scraper.utils.bs_utils import base_url, clean_soup, get_tags_and_links


@dataclass
class OneDeepMerger(Writer):
    file_name: str = None
    in_folder: str = None

    def process(
        self, soup: BeautifulSoup, instance_info: InstanceInfo = None, url : str = None
    ) -> BeautifulSoup:
        
        if url is None:
            if instance_info is not None and instance_info.web_file is not None:
                url = instance_info.web_file.uri
            else:
                raise ValueError("No web_file in instance_info. Base URL must be specified")
        if self.in_folder is None:
            raise ValueError("No in_folder specified for OneDeepMerger")
        b_url = base_url(url)
        # print(f"{original_url} -> b_url=", b_url)
        # print(soup.prettify())
        for a, link in get_tags_and_links(original_url=b_url, file_or_soup=soup ):
            file_name = link.removeprefix(b_url).strip("/")
            # print(a, b_url, link, file_name)
            lname = self.meta.get_file(file_name=file_name, group=self.in_folder)
            bname = os.path.basename(lname)
            lsoup = clean_soup(str(lname))
            cbody = lsoup.find("body").findChildren(recursive=False)
            # body = ''.join(['%s' % x for x in soup.body.contents])
            # if write_to_file:
            #     HTMLWriter().process(f"{write_location}/{file_prefix}_link_{bname}.html", lsoup)
            for body in cbody[::-1]:
                a.insert_after(body)

        return soup
