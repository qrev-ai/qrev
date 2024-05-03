import logging
import os
import re
import tempfile
import tomllib as toml
import unittest
from pathlib import Path
from pprint import pprint

from bs4 import BeautifulSoup

from qai.core import Meta
from qai.scraper.filters.filter import Filter
from qai.scraper.processors.tag_keeper import TagKeeper

logging.basicConfig(level=logging.DEBUG)


class TestFilter(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass

    def test_keep_remove_sanitize(self):
        cfg_str = """
            [[pipeline]]
            pipeline = ["Keep1", "Remove", "Simplify"]

            [[processors]]
            name = "Keep1"
            ul = true

            [[processors]]
            name = "Remove"
            b = true
        """
        html_str = """
            <html>
            <h1>HTML Ipsum Presents</h1>
            <ol>
                <li>1</li>
                <li>2</li>
            </ol>
            <ul>
                <li>a <b>b</b></li>
                <li>c</li>
            </ul>
            </html>
        """
        cfg = toml.loads(cfg_str)
        f = Filter(cfg)
        soup = f.filter_html_string(html_str)
        # print(soup.prettify())
        s = soup.text.strip().split()
        self.assertEqual(s, ["a", "c"])

    def test_filter_by_file_regex(self):
        cfg_str = """
            [[pipeline]]
            pipeline = ["Keep"]
            file_regex = "a+"
            [[processors]]
            name = "Keep"
            h1 = true
        """
        html_str = """
            <html>
            <h1>Kept</h1>
            <ol>
                <li>1</li>
                <li>2</li>
            </ol>
            <ul>
                <li>a <b>b</b></li>
                <li>c</li>
            </ul>
            </html>
        """
        with tempfile.TemporaryDirectory() as tempdir:
            os.makedirs(tempdir, exist_ok=True)
            with open(f"{tempdir}/a.html", "w") as f:
                f.write(html_str)
            with open(f"{tempdir}/b.html", "w") as f:
                f.write(html_str)
            cfg = toml.loads(cfg_str)
            f = Filter(cfg)

            f.process_directory(in_folder=Path(tempdir).absolute())

    def test_filter_tagging(self):
        cfg_str = """
            [[pipeline]]
            pipeline = ["Keep"]
            file_regex = "a+"
            tags = "tag:a"
            
            [[processors]]
            name = "Keep"
            h1 = true
        """
        html_str = """
            <html>
            <h1>Kept</h1>
            <ol>
                <li>1</li>
                <li>2</li>
            </ol>
            <ul>
                <li>a <b>b</b></li>
                <li>c</li>
            </ul>
            </html>
        """
        # with tempfile.TemporaryDirectory() as tempdir:
        tempdir = "tempdir"
        os.makedirs(tempdir, exist_ok=True)
        meta = Meta.from_directory(tempdir, create=True)
        with open(f"{tempdir}/a.html", "w") as f:
            f.write(html_str)
        meta.save()
        cfg = toml.loads(cfg_str)
        f = Filter(cfg, meta=meta)
        f.process_file(Path(f"{tempdir}/a.html").absolute())
        # meta.add_tag("tag:b", "a.html")
        meta.save()
        from pprint import pprint
        pprint(meta)


if __name__ == "__main__":
    testmethod = "test_keep_remove_sanitize"
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestFilter(testmethod))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
