from typing import Any

from qai.core import Meta

from qai.scraper.processors.div_table import DivTable
from qai.scraper.processors.html_simplifier import HTMLSimplifier
from qai.scraper.processors.html_writer import HTMLWriter
from qai.scraper.processors.markdown_writer import MarkdownWriter
from qai.scraper.processors.one_deep_merger import OneDeepMerger
from qai.scraper.processors.processors import Processor
from qai.scraper.processors.tag_denester import TagDenester
from qai.scraper.processors.tag_keeper import TagKeeper
from qai.scraper.processors.tag_remover import CleanHtml, TagRemover
from qai.scraper.processors.text_writer import TextWriter
from qai.scraper.processors.value_converter import ValueConverter


def get_processor(name: str = None, config: dict[str, Any] = None, meta:Meta=None) -> Processor:
    if config is None:
        config = {}
    config = config.copy()
    if name is None:
        name = config.get("name")
    if name is None:
        raise ValueError("Processor name must be provided, either as argument or in config")
    name = name.lower()
    cfg_meta = config.pop("meta", meta)
    if meta is None:
        meta = cfg_meta

    if name.startswith("onedeepmerger") or name.startswith("onedeep"):
        cls = OneDeepMerger
    elif name.startswith("cleanhtml") or name.startswith("clean"):
        cls = CleanHtml
    elif name.startswith("htmlwriter") or name.startswith("html"):
        cls = HTMLWriter
    elif name.startswith("tagremover") or name.startswith("remove"):
        cls = TagRemover
    elif name.startswith("tagkeeper") or name.startswith("keep"):
        cls = TagKeeper
    elif name.startswith("htmlsimplifier") or name.startswith("simpli"):
        cls = HTMLSimplifier
    elif name.startswith("tagdenester") or name.startswith("denest"):
        cls = TagDenester
    elif name.startswith("textwriter") or name.startswith("text"):
        cls = TextWriter
    elif name.startswith("markdownwriter") or name.startswith("markdown"):
        cls = MarkdownWriter
    elif name.startswith("valueconverter") or name.startswith("convert"):
        cls = ValueConverter
    elif name.startswith("divtable"):
        cls = DivTable
    else:
        raise NotImplementedError(f"Processor {name} not implemented")
    flds = cls.acceptable_fields()
    cfg = config.copy()
    cfg = {k: v for k, v in cfg.items() if k in flds}
    return cls(meta=meta, **cfg)

