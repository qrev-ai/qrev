import unittest

from bs4 import BeautifulSoup

from qai.scraper.processors.tag_denester import TagDenester


class TestDenest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass

    def test_strip_all(self):
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
        self.assertEqual(len(newsoup.find_all("div")), 1)

    def test_remove_spans(self):
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
        self.assertEqual(len(results), 5)

if __name__ == "__main__":
    test_method = ""
    if not test_method:
        unittest.main()
    else:
        ## test one method
        suite = unittest.TestSuite()
        suite.addTest(TestDenest(test_method))
        runner = unittest.TextTestRunner()
        runner.run(suite)
