import unittest

from bs4 import BeautifulSoup

from qai.scraper.processors.tag_keeper import TagKeeper


class TestTagKeeper(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass


    def test_strip_all(self):
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
        self.assertEqual(s, "")

    def test_strip_all_but_ul(self):
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
        self.assertEqual(a, ["a", "b", "b"])


    def test_strip_all_but_ol_nested(self):
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
        self.assertEqual(a, ["1", "2"])


    def test_keep_class(self):
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
        self.assertEqual(a, ["1"])

    def test_keep_parent(self):
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
        self.assertEqual(a, ["1"])


if __name__ == "__main__":
    test_method = ""
    if not test_method:
        unittest.main()
    else: ## test one method
        suite = unittest.TestSuite()
        suite.addTest(TestTagKeeper(test_method))
        runner = unittest.TextTestRunner()
        runner.run(suite)
