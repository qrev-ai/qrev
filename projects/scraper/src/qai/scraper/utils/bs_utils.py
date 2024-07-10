import io
import os
import re
from pathlib import Path
from typing import Any, Set, Union
from urllib.parse import urljoin, urlsplit

import validators
from bs4 import BeautifulSoup, element
from lxml.html.clean import Cleaner


def base_url(url):
    split_url = urlsplit(url)
    return f"{split_url.scheme}://{split_url.netloc}"


def url_with_path(url):
    split_url = urlsplit(url)
    url = f"{split_url.scheme}://{split_url.netloc}{split_url.path}"
    if url.endswith("/"):
        url = url[:-1]
    return url


def url_with_www(url):
    split_url = urlsplit(url)
    url = f"{split_url.scheme}://www.{split_url.netloc}{split_url.path}"
    if url.endswith("/"):
        url = url[:-1]
    return url


def validate_url(url):
    u = url_with_path(url)
    e = validators.url(url)
    if e == True:
        return e
    else:
        url = url_with_www(url)
        return validators.url(url)


def make_soup_from_file(file_or_fp: str | io.FileIO, default_parser: str = "lxml") -> BeautifulSoup:
    if isinstance(file_or_fp, io.IOBase):
        file_or_fp = file_or_fp.read()
    else:
        file_or_fp = str(file_or_fp)
        potential_path = os.path.expanduser(file_or_fp)
        if not os.path.exists(potential_path):
            raise FileNotFoundError(f"File {file_or_fp} not found")
        with open(potential_path, "r") as fp:
            file_or_fp = fp.read()
    return BeautifulSoup(file_or_fp, default_parser)


def make_soup(
    html_str_or_path_or_fp: str | io.FileIO, default_parser: str = "lxml"
) -> BeautifulSoup:
    if isinstance(html_str_or_path_or_fp, io.IOBase):
        html_str_or_path_or_fp = html_str_or_path_or_fp.read()
    else:
        if isinstance(html_str_or_path_or_fp, str):
            potential_path = os.path.expanduser(html_str_or_path_or_fp)
        else:
            potential_path = html_str_or_path_or_fp
        if os.path.exists(potential_path):
            with open(potential_path, "r") as fp:
                html_str_or_path_or_fp = fp.read()
    return BeautifulSoup(html_str_or_path_or_fp, default_parser)

def html_strip(html_str: str) -> str:
    s = str(html_str).replace("\n", " ")
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
    return s.strip()

def sanitize(dirty_html: str):
    cleaner = Cleaner(
        page_structure=True,
        meta=True,
        embedded=True,
        links=True,
        style=True,
        processing_instructions=True,
        inline_style=True,
        scripts=True,
        javascript=True,
        comments=True,
        frames=True,
        forms=True,
        annoying_tags=True,
        remove_unknown_tags=True,
        safe_attrs_only=False,
        safe_attrs=frozenset(["src", "color", "href", "title", "class", "name", "id"]),
        remove_tags=("span", "font", "div"),
    )

    return cleaner.clean_html(dirty_html)


def clean_soup(html_file_or_fp: str | Path) -> BeautifulSoup:
    from qai.scraper.processors.tag_remover import CleanHtml
    if isinstance(html_file_or_fp, Path):
        html_file_or_fp = str(html_file_or_fp)
    if isinstance(html_file_or_fp, str):
        with open(html_file_or_fp) as fp:
            soup = BeautifulSoup(fp, "html.parser")
    else:
        soup = BeautifulSoup(html_file_or_fp, "html.parser")
    soup = CleanHtml().process(soup)
    return soup


def get_tags_and_links(
    original_url, file_or_soup: str | BeautifulSoup, exclude_parameters=True, depth: int = 1
) -> list[tuple[element.Tag, str]]:
    soup = make_soup(file_or_soup)
    original_url = original_url.replace("www.", "")
    url_is_https = original_url.startswith("https")
    url_is_http = not url_is_https and original_url.startswith("http")
    url_without_http =  "/" + re.sub(r'^https?:\/\/', '', original_url)
    b_url = base_url(original_url)
    # print(f"{original_url} -> b_url=", b_url)
    found_links = {}

    for a in soup.find_all("a", href=True):
        link = a["href"]
        if link.startswith("http"): ## absolute url
            if not link.startswith(b_url): ## not our domain
                continue
        else: ## Relative url
            link = urljoin(original_url, link)
            # if link.startswith("/"): # absolute to root
            #     link = f"{b_url}{link}"
            # else: # relative to current page
            #     link = os.path.abspath(os.path.join(url_without_http, link))
            #     if url_is_http:
            #         link = f"http:/{link}"
            #     if url_is_https:
            #         link = f"https:/{link}"
        if exclude_parameters:
            link = url_with_path(link)

        if validate_url(link):
            if link not in found_links:
                found_links[link] = a

    return list([(v, k) for k, v in found_links.items()])

def get_links(
    original_url, file_or_soup: str | BeautifulSoup, exclude_parameters=True, depth: int = 1
) -> Set[str]:
    tags_and_links = get_tags_and_links(original_url, file_or_soup, exclude_parameters, depth)
    return list(set([link for _, link in tags_and_links]))
