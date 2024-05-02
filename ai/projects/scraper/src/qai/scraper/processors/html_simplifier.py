import re
from dataclasses import dataclass
from typing import List

import ftfy
from bs4 import BeautifulSoup, NavigableString, Tag

from qai.scraper.processors.tag_denester import TagDenester
from qai.scraper.utils.bs_utils import sanitize as sanitize_html_str

from .processors import Processor


@dataclass
class HTMLSimplifier(Processor):
    file_name: str = None
    sanitize: bool = True
    denest: bool = True
    simplify_p: bool = True
    empty: bool = True
    unwrap_a: bool = True
    unwrap_b: bool = True
    unwrap_i: bool = True
    unwrap_em: bool = True
    unwrap_strong: bool = True
    unwrap_it: bool = True
    unwrap_img: bool = False
    value_from_attributes: list[str] = None

    def process(self, soup: BeautifulSoup, file_name: str = None, **kwargs) -> BeautifulSoup:
        if file_name is None:
            file_name = self.file_name
        html_str = ftfy.fix_text(str(soup))
        soup = self.make_soup(html_str)

        if self.sanitize:
            html_str = sanitize_html_str(str(soup))
            soup = self.make_soup(html_str)
        ## change values if they are dynamically set in attributes
        if self.value_from_attributes:
            attrs = set(self.value_from_attributes)
            for tag in soup.find_all(lambda t: len(t.attrs) and attrs.intersection(t.attrs.keys())):
                for a in attrs.intersection(tag.attrs.keys()):
                    tag.string = tag.attrs[a]
        ## Unwrap tags
        unwrap_tags = set()
        if self.unwrap_img:
            unwrap_tags.add("img")
        if self.unwrap_a:
            unwrap_tags.add("a")
        if self.unwrap_b:
            unwrap_tags.add("b")
        if self.unwrap_i:
            unwrap_tags.add("i")
        if self.unwrap_em:
            unwrap_tags.add("em")
        if self.unwrap_strong:
            unwrap_tags.add("strong")
        if self.unwrap_it:
            unwrap_tags.add("it")
        if self.denest:
            soup = TagDenester().process(soup)

        for tag in soup.find_all(unwrap_tags):
            tag.unwrap()

        if self.empty:
            locked = set(["html", "body", "br"])
            for e in soup.find_all():
                if not e.get_text(strip=True).strip() and e.name not in locked:
                    e.decompose()

        ## Simplify text
        e: Tag
        for e in soup.find_all():
            txt = e.find(string=True, recursive=False)
            if not txt:
                continue
            size = len(e.contents)
            for i, c in enumerate(e.contents):
                if isinstance(c, NavigableString) and c.parent == e:
                    modify = True
                    if i < size - 1:
                        nxt = e.contents[i + 1]
                        if isinstance(nxt, NavigableString):
                            nxt.replace_with(str(c) + " " + str(nxt))
                            c.replace_with("")
                            modify = False
                    if modify:
                        s = str(c).replace("\n", " ")
                        s = s.replace("\t", " ")
                        s = re.sub(r"\s+", " ", s)
                        ## Remove spaces before punctuation
                        s = re.sub(r"\s+[.]", ".", s)
                        s = re.sub(r"\s+[?]", "?", s)
                        s = re.sub(r"\s+[!]", "!", s)
                        s = re.sub(r"\s+[;]", ";", s)
                        s = re.sub(r"\s+[,]", ",", s)
                        ## Correctly format percentages (50%)
                        s = re.sub(r"(\d+)\s+[%]", r"\1%", s)
                        ## Times symbol (3x speed, or 4x4)
                        s = re.sub(r"(\d+)\s+x(\s)", r"\1x\2", s)
                        s = re.sub(r"(\d+)x\s+(\d+)", r"\1x\2", s)
                        c.replace_with(s)

        if file_name:
            with open(file_name, "w") as fp:
                html_s = str(soup.prettify())
                fp.write(html_s)
        return soup
