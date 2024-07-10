from dataclasses import dataclass
from typing import Any

from bs4 import BeautifulSoup

from .processors import Processor


@dataclass
class TagRemover(Processor):
    header: bool = False
    footer: bool = False
    javascript: bool = False
    css: bool = False
    style: bool = False
    images: bool = False
    img: bool = False
    svg: bool = False
    empty: bool = False
    meta: bool = False
    document: bool = False
    buttons: bool = False
    ol: bool = False
    ul: bool = False
    a: bool = False
    b: bool = False
    p_in_a: bool = False
    classes: list[str] = None
    tags: list[str] = None

    def process(
        self, soup: BeautifulSoup, instance_info: dict[str, Any] = None, **kwargs
    ) -> BeautifulSoup:
        to_remove_classes = [] if not self.classes else self.classes
        to_remove = []
        if self.header:
            to_remove += ["header", "head", "page-header"]
            to_remove_classes += ["header", "head", "page-header"]
        if self.footer:
            to_remove += ["footer", "foot", "page-footer"]
        if self.javascript:
            to_remove += ["script", "noscript"]
        if self.css:
            to_remove += ["css"]
        if self.images:
            to_remove += ["img", "svg"]
        if self.img:
            to_remove += ["img"]
        if self.svg:
            to_remove += ["svg"]
        if self.style:
            to_remove += ["style"]
        if self.meta:
            to_remove += ["meta"]
        if self.document:
            to_remove += ["[document]"]
        if self.buttons:
            to_remove += ["button"]
        if self.b:
            to_remove += ["b"]
        if self.a:
            to_remove += ["a"]
        if self.ol:
            to_remove += ["ol"]
        if self.ul:
            to_remove += ["ul"]
        if self.tags:
            to_remove += self.tags
        if to_remove:
            for e in soup.find_all(to_remove):
                e.decompose()
        ## remove p tags inside a tags
        if self.p_in_a:
            for e in soup.find_all("a"):
                for p in e.find_all("p"):
                    p.unwrap()
        to_remove_classes = set(to_remove_classes)
        # print(soup.prettify())
        for c in to_remove_classes:
            for e in soup.find_all(class_=c):
                e.decompose()
        if self.empty:
            locked = set(["html", "body", "br"])
            for e in soup.find_all():
                if not e.get_text(strip=True).strip() and e.name not in locked:
                    e.decompose()

        return soup


@dataclass
class CleanHtml(TagRemover):
    javascript: bool = True
    css: bool = True
    style: bool = True
    images: bool = True
