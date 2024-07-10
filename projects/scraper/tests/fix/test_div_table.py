import logging
import unittest


from qai.scraper.processors.div_table import DivTable

logging.basicConfig(level=logging.DEBUG)



class TestDivTable(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass


    def test_div_one_column(self):
        html_str = """
            <div name="table">
                <div name="headers">
                    <div name="nav.header">Header 1</div>
                    <div name="section.items">
                        <div name="Item">Item 1</div>
                        <div name="Item">Item 2</div>
                    </div>
                </div>
            </div>
        """
        tk = DivTable(
            table="table",
            columns=["headers"],
            tr="Item"
        )
        soup = tk.make_soup(html_str)
        newsoup = tk.process(soup)

        answer = ["Item 1", "Item 2"]
        texts = [e.text.strip() for e in newsoup.find_all("td")]
        self.assertEqual(texts, answer)


    def test_div_multi_column(self):
        html_str = """
            <div name="table">
                <div name="column1">
                    <div name="nav.header">Header 1</div>
                    <div name="section.items">
                        <div name="Item">Item 1</div>
                        <div name="Item">Item 2</div>
                    </div>
                </div>
                <div name="column2">
                    <div name="nav.header">Header 2</div>
                    <div name="section.items">
                        <div name="Item">Item a</div>
                        <div name="Item">Item b</div>
                    </div>
                </div>
            </div>
        """
        tk = DivTable(
            table="table",
            columns=["column1", "column2"],
            trs=["Item"]
        )
        soup = tk.make_soup(html_str)
        newsoup = tk.process(soup)
        print(newsoup.prettify())
        answer = ["Item 1", "Item a", "Item 2", "Item b"]
        texts = [e.text.strip() for e in newsoup.find_all("td")]
        self.assertEqual(texts, answer)



if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestDivTable(testmethod))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
