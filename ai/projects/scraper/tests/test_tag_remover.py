import sys
import pytest


from qai.scraper.processors.tag_remover import TagRemover


def test_remove_tag():
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

    tk = TagRemover(ol=True)
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)

    assert len(newsoup.find_all("ol")) == 0
    assert len(newsoup.find_all("ul")) == 1


def test_remove_class():
    html_str = """
        <html>
        <h1>HTML Ipsum Presents</h1>
        <ol class="a">
            <li>1</li>
            <li>2</li>
        </ol>
        <ul>
            <li>a <b>b</b></li>
            <li>b</li>
        </ul>
        </html>
    """

    tk = TagRemover(classes=["a"])
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)

    assert len(newsoup.find_all("ol")) == 0
    assert len(newsoup.find_all("ul")) == 1


if __name__ == "__main__":
    pytest.main([sys.argv[0]])
