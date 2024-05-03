# This is actually a markdown writer
import os
import tempfile
import unittest

from bs4 import BeautifulSoup

from qai.core import Meta
from qai.scraper.processors.markdown_writer import MarkdownWriter


class TestMDWriter(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass

    def test_markdown_with_bold(self):
        html_str = """
            <h3>
            A <em><b>B</b></em> C <i>D</i> E
            F <b>G</b> H <i>I</i> J  .
            </h3>
        """
        expected_output = "###  A _**B** _ C _D_ E F **G** H _I_ J . \n"
        soup = BeautifulSoup(html_str, "html.parser")
        meta = Meta.create_ephemeral()
        file_path = meta.root / "simplified_testing.md"
        proc = MarkdownWriter(file_name=file_path, meta=meta)
        proc.process(soup)
        self.assertTrue(os.path.exists(meta.get_file("simplified_testing.md")))
        with open(file_path, "r") as f:
            self.assertEqual(expected_output, f.read())


if __name__ == "__main__":
    test_method = ""
    if not test_method:
        unittest.main()
    else:
        ## test one method
        suite = unittest.TestSuite()
        suite.addTest(MarkdownWriter(test_method))
        runner = unittest.TextTestRunner()
        runner.run(suite)
