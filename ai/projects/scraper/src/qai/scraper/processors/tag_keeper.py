from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from bs4 import BeautifulSoup, Tag

from .processors import Processor


@dataclass
class TagKeeper(Processor):
    keep_parents = True
    keep_children = True
    html: bool = True
    body: bool = True
    br: bool = True
    header: bool = False
    footer: bool = False
    javascript: bool = False
    css: bool = False
    style: bool = False
    images: bool = False
    empty: bool = False
    meta: bool = False
    document: bool = False
    buttons: bool = False
    h1: bool = False
    h2: bool = False
    h3: bool = False
    ol: bool = False
    ul: bool = False
    li: bool = False
    div: bool = False
    classes: list[str] = None
    name: str = None

    def process(
        self,
        soup: BeautifulSoup,
        instance_info: dict[str, Any] = None,
    ) -> BeautifulSoup:
        if not self.classes:
            self.classes = []
        locked = set()
        parent_map = defaultdict(set)
        to_keep = []
        if self.html:
            locked.add("html")
        if self.body:
            locked.add("body")
        if self.br:
            locked.add("br")
        if self.h1:
            to_keep += ["h1"]
        if self.h2:
            to_keep += ["h2"]
        if self.h3:
            to_keep += ["h3"]
        if self.header:
            to_keep += ["header", "head", "page-header"]
            self.classes += ["header", "head", "page-header"]
        if self.footer:
            to_keep += ["footer", "foot", "page-footer"]
        if self.javascript:
            to_keep += ["script", "noscript"]
        if self.css:
            to_keep += ["css"]
        if self.images:
            to_keep += ["img"]
        if self.style:
            to_keep += ["style"]
        if self.meta:
            to_keep += ["meta"]
        if self.document:
            to_keep += ["[document]"]
        if self.buttons:
            to_keep += ["button"]
        if self.ol:
            to_keep += ["ol"]
        if self.ul:
            to_keep += ["ul"]
        if self.li:
            to_keep += ["li"]
        if self.div:
            to_keep += ["div"]

        to_keep = set(to_keep)
        to_keep_classes = set(self.classes)

        # Find all tags, then filter out the irrelevant ones
        remove = set()
        keep = set()

        def is_a_parent(e: Tag, tocheck: Tag) -> bool:
            parents = parent_map.get(e, set())
            if tocheck in parents:
                return True
            for p in parents:
                parents.update(is_a_parent(p))
            return tocheck in parents

        for e in soup.find_all():
            if e in keep:
                continue

            should_keep = False
            if e.name in to_keep:
                should_keep = True
            else:
                classes = e.get("class")
                if classes:
                    classes = set(classes)
                    if classes.intersection(to_keep_classes):
                        should_keep = True

            ## keep all tags that are children of the kept tag
            if should_keep and self.keep_children:
                keep.update(e.find_all())
            if should_keep and self.keep_parents:
                keep.update(e.find_parents())

            if e.name in locked:
                should_keep = True
            if should_keep:
                keep.add(e)
            else:
                remove.add(e)
        remove = remove - keep
        for e in remove:
            if e and not e.decomposed:
                e.decompose()

        return soup
