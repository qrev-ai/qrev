import sys

import pytest
from bs4 import BeautifulSoup

from qai.scraper.processors.tag_denester import TagDenester


def test_strip_all():
    html_str = """
        <html>
        <div><div><div>
            1    
        </div></div></div>
        </html>
    """
    soup = BeautifulSoup(html_str, "html.parser")
    tk = TagDenester()
    newsoup = tk.process(soup)
    assert len(newsoup.find_all("div")) == 1


def test_remove_spans():
    html_str = """
        <html>
        <p>
        Other text
        </p>
        <p2>
        <span>These<span>should<span>be<span>separated</span></span></span></span>
        </p2>
        </html>
    """
    # <span>Same</span><span>for</span><span>this</span>
    soup = BeautifulSoup(html_str, "html.parser")
    tk = TagDenester()
    newsoup = tk.process(soup)

    results = list(newsoup.stripped_strings)
    assert len(results) == 5


if __name__ == "__main__":
    pytest.main([sys.argv[0]])
