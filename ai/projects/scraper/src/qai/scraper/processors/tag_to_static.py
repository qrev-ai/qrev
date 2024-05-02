from dataclasses import dataclass
from typing import List, Set

from bs4 import BeautifulSoup

from .processors import Processor
import re

def prettify_tag(html, tag):
    reg_tag = re.compile(f'\s*<{tag}([^>]*)>\s*')
    html = reg_tag.sub(f'<{tag}\\1>', html)
    html = re.sub(f'\s*</{tag}>\s*',f'</{tag}>', html)
    return html

@dataclass
class TagDenester(Processor):
    div: bool = True
    span: bool = True
    spans_become_spaces = True
    all_others: bool = True

    def process(
        self,
        soup: BeautifulSoup,
    ) -> BeautifulSoup:
        for e in soup.find_all():
            if self.div:
                if e.name == "div":
                    if e.parent.name == "div":
                        e.unwrap()
            if self.span:
                if e.name == "span":
                    e.unwrap()
            if self.all_others:
                if e.name not in ["div", "span"]:
                    if e.parent.name == e.name:
                        e.unwrap()
            # if self.span and e.name == "span":
            #     pe = e.parent
            #     # if self.spans_become_spaces:
            #         # pe.string += " " + e.get_text().strip()
            #     e.unwrap()
        return soup
