import logging
import os
import re
import sys
from dataclasses import dataclass
from typing import Any

import ftfy
from bs4 import BeautifulSoup
from markdownify import markdownify as md

from qai.scraper.processors.writer import Writer
from qai.core import MetaFile, MetaDir

@dataclass
class MarkdownWriter(Writer):
    file_name: str = None
    body_width: int = None

    def process(
        self, soup: BeautifulSoup, instance_info: dict[str, Any] = None, typ=1
    ) -> BeautifulSoup:
        group: MetaDir = self._append_and_modify_filename("md", instance_info=instance_info)
        if not self.out_folder and not self.file_name:
            raise ValueError("out_folder must be specified for MarkdownWriter")
        if not self.file_name:
            ii = instance_info
            self.file_name = ii["web_file"].path(self.out_folder)
        ## TODO check when this needs to happen
        ## switch extension to .md
        if not isinstance(self.file_name, str):
            self.file_name = str(self.file_name)
        if not self.file_name.endswith(".md"):
            f, __ = os.path.splitext(self.file_name)
            self.file_name = f + ".md"
        with open(self.file_name, "w") as fp:
            print(f"Writing markdown to {self.file_name}")
            html = ftfy.fix_text(str(soup.prettify()))
            if typ == 0:
                new_str = md(html)
            elif typ == 1:
                import html2text

                h = html2text.HTML2Text(bodywidth=self.body_width)
                new_str = h.handle(html)
            logging.debug(f"Writing markdown to {self.file_name}")
            fp.write(new_str) 
            if self.meta:
                mf = MetaFile(path=self.file_name, metadata={"instance_info": instance_info})
                if group:
                    group.add_file(mf)
                else:
                    self.meta.add_file(mf)


        return soup
