import unittest

from qai.scraper.processors.html_simplifier import HTMLSimplifier


class TestSimplifier(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass

    def test_simplify_sentences(self):
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
        self.assertEqual(newsoup.find("h3").text.strip(), h3_answer)

    def test_lots_of_whitespace(self):
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
        self.assertEqual(newsoup.find("section").text.strip(), h3_answer)

    def test_lots_of_whitespace_with_children(self):
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
        self.assertEqual(newsoup.find("section").text.strip(), h3_answer)

    def test_value_from_attr(self):
        html_str = """
            <p real-value="10">0</p>
        """
        tk = HTMLSimplifier(value_from_attributes=["real-value"])
        soup = tk.make_soup(html_str)
        newsoup = tk.process(soup)

        h3_answer = "10"
        self.assertEqual(newsoup.find("p").text.strip(), h3_answer)

    def test_correct_percentage(self):
        html_str = """
            <p> 50  %</p>
        """
        tk = HTMLSimplifier(value_from_attributes=["real-value"])
        soup = tk.make_soup(html_str)
        newsoup = tk.process(soup)

        h3_answer = "50%"
        self.assertEqual(newsoup.find("p").text.strip(), h3_answer)

    def test_correct_times(self):
        html_str = """
            <p> 50 x speed!</p>
        """
        tk = HTMLSimplifier()
        soup = tk.make_soup(html_str)
        newsoup = tk.process(soup)
        h3_answer = "50x speed!"
        self.assertEqual(newsoup.find("p").text.strip(), h3_answer)

    def test_correct_times2(self):
        html_str = """
            <p> 8 x 8 </p>
        """
        tk = HTMLSimplifier()
        soup = tk.make_soup(html_str)
        newsoup = tk.process(soup)
        h3_answer = "8x8"
        self.assertEqual(newsoup.find("p").text.strip(), h3_answer)


if __name__ == "__main__":
    test_method = ""
    if not test_method:
        unittest.main()
    else:
        ## test one method
        suite = unittest.TestSuite()
        suite.addTest(TestSimplifier(test_method))
        runner = unittest.TextTestRunner()
        runner.run(suite)
