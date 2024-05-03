import unittest


from qai.scraper.processors.tag_remover import TagRemover


class TestTagRemover(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass

    def test_remove_tag(self):
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
    
        self.assertEqual(len(newsoup.find_all("ol")), 0)
        self.assertEqual(len(newsoup.find_all("ul")), 1)

    def test_remove_class(self):
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
        
        self.assertEqual(len(newsoup.find_all("ol")), 0)
        self.assertEqual(len(newsoup.find_all("ul")), 1)


if __name__ == "__main__":
    test_method = ""
    if not test_method:
        unittest.main()
    else:  ## test one method
        suite = unittest.TestSuite()
        suite.addTest(TestTagRemover(test_method))
        runner = unittest.TextTestRunner()
        runner.run(suite)
