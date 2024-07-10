import sys

import pytest

from qai.scraper.processors.html_simplifier import HTMLSimplifier


def test_simplify_sentences():
    html_str = """
        <h3>
        a <em><b>b</b></em> c <i>d</i> e
        f <b>g</b> h <i>i</i> j  .
        </h3>
    """
    tk = HTMLSimplifier()
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)

    h3_answer = "a b c d e f g h i j."
    assert newsoup.find("h3").text.strip() == h3_answer


def test_lots_of_whitespace():
    html_str = """
        <section>
        a
        b
        c
                d
        e   f   g           h   
                                
                                
                                i

                                
                                j
                                .</section>
    """
    tk = HTMLSimplifier()
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)

    h3_answer = "a b c d e f g h i j."
    assert newsoup.find("section").text.strip() == h3_answer


def test_lots_of_whitespace_with_children():
    html_str = """
            <section>
            a
            b
            c
                    d
            e   f   g           h   
                                    
                                    
                                    i

                                    
                                    <a>j</a>
                                    .</section>
        """
    tk = HTMLSimplifier()
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)

    h3_answer = "a b c d e f g h i j."
    txt = newsoup.find("section").text
    assert txt.strip() == h3_answer


def test_value_from_attr():
    html_str = """
        <p real-value="10">0</p>
    """
    tk = HTMLSimplifier(value_from_attributes=["real-value"])
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)

    h3_answer = "10"
    assert newsoup.find("p").text.strip() == h3_answer


def test_correct_percentage():
    html_str = """
        <p> 50  %</p>
    """
    tk = HTMLSimplifier(value_from_attributes=["real-value"])
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)

    h3_answer = "50%"
    assert newsoup.find("p").text.strip() == h3_answer


def test_correct_times():
    html_str = """
        <p> 50 x speed!</p>
    """
    tk = HTMLSimplifier()
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)
    h3_answer = "50x speed!"
    assert newsoup.find("p").text.strip() == h3_answer


def test_correct_times2():
    html_str = """
        <p> 8 x 8 </p>
    """
    tk = HTMLSimplifier()
    soup = tk.make_soup(html_str)
    newsoup = tk.process(soup)
    h3_answer = "8x8"
    assert newsoup.find("p").text.strip() == h3_answer


if __name__ == "__main__":
    pytest.main([sys.argv[0]])
