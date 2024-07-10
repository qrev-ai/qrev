import sys

import pytest
from bs4 import BeautifulSoup

from qai.scraper.processors.tag_keeper import TagKeeper


def test_strip_all():
    html_str = """
        <html>
        <h1>HTML Ipsum Presents</h1>
        <ol>
            <li>1</li>
            <li>2</li>
        </ol>
        <ul>
            <li>a <b>b</b></li>
            <li>b</li>
        </ul>
        </html>
    """
    soup = BeautifulSoup(html_str, "lxml")
    tk = TagKeeper()
    newsoup = tk.process(soup)
    s = newsoup.text.strip()
    assert s == ""


def test_strip_all_but_ul():
    html_str = """
        <html>
        <h1>HTML Ipsum Presents</h1>
        <ol>
            <li>1</li>
            <li>2</li>
        </ol>
        <ul>
            <li>a <b>b</b></li>
            <li>b</li>
        </ul>
        </html>
    """

    soup = BeautifulSoup(html_str, "html.parser")
    tk = TagKeeper(ul=True)
    newsoup = tk.process(soup)
    s = newsoup.text.strip()
    a = s.split()
    assert a == ["a", "b", "b"]


def test_strip_all_but_ol_nested():
    html_str = """
        <html>
        <h1>HTML Ipsum Presents</h1>
        <h2><div><p>
            <ol>
                <li>1</li>
                <li>2</li>
            </ol>
        </p></div></h2>
        <ul>
            <li>a <b>b</b></li>
            <li>b</li>
        </ul>
        </html>
    """
    soup = BeautifulSoup(html_str, "html.parser")
    tk = TagKeeper(ol=True)
    newsoup = tk.process(soup)
    s = newsoup.text.strip()
    a = s.split()
    assert a == ["1", "2"]


def test_keep_class():
    html_str = """
    <html>
    <h1>HTML Ipsum Presents</h1>
    <div class="a">
        <p>1</p>
    </div>
    <div class="b c">
        <p>2</p>
    </div>
    </html>
    """
    soup = BeautifulSoup(html_str, "html.parser")
    tk = TagKeeper(classes=["a"])
    newsoup = tk.process(soup)

    s = newsoup.text.strip()

    a = s.split()
    assert a == ["1"]


def test_keep_parent():
    html_str = """
        <html>
        <h1>HTML Ipsum Presents</h1>
        <h2><div><p>
            <ol>
                <li><div class="keep">1</keep></li>
                <li>2</li>
            </ol>
        </p></div></h2>
        <ul>
            <li>a <b>b</b></li>
            <li>b</li>
        </ul>
        </html>
    """
    soup = BeautifulSoup(html_str, "html.parser")
    tk = TagKeeper(classes=["keep"])
    newsoup = tk.process(soup)

    s = newsoup.text.strip()

    a = s.split()
    assert a == ["1"]


if __name__ == "__main__":
    pytest.main([sys.argv[0]])
