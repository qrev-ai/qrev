import os
from dataclasses import dataclass
from typing import Any

import ftfy
from bs4 import BeautifulSoup

from qai.scraper.filters.meta import InstanceInfo
from qai.scraper.processors.writer import Writer
from qai.core import MetaFile
import os
import re
import tempfile
import unittest
from pprint import pprint

import pandas as pd
from bs4 import BeautifulSoup

from qai.core import Meta
from qai.scraper.processors.one_deep_merger import OneDeepMerger
from qai.scraper.processors.tag_denester import TagDenester


def test_one_deep(tmp_path):
    tempdir = "tempdir"
    rawdir = f"{tempdir}/raw"
    os.makedirs(rawdir, exist_ok=True)
    
    meta = Meta.from_directory(tempdir, create=True)
    html_str = """
        <html>
        <body>
        <p>a</p>
        <a href="/b.html">b_link</a>
        </body>
        </html>
    """
    soup = BeautifulSoup(html_str, "html.parser")
    with open(f"{rawdir}/a.html", "w") as f:
        f.write(html_str)
    meta.add_file(f"{rawdir}/a.html", group="raw")
    html_str = """
        <html>
        <body>
        <p class="b">In B</p>
        </body>
        </html>
    """
    with open(f"{rawdir}/b.html", "w") as f:
        f.write(html_str)
    meta.add_file(f"{rawdir}/b.html", group="raw")

    tk = OneDeepMerger(meta=meta, in_folder="raw", out_folder=f"{tempdir}/out")
    newsoup = tk.process(soup, url="http://localhost/index.html")
    belement = newsoup.find_all("p", {"class": "b"})
    self.assertEqual(len(belement), 1)
    self.assertEqual(str(belement[0]), '<p class="b">In B</p>')

# def test_one_deep_multiple(self):
#     tempdir = "tempdir"
#     rawdir = f"{tempdir}/raw"
#     os.makedirs(rawdir, exist_ok=True)
#     # meta = Meta.create_ephemeral()
#     meta = Meta.from_directory(tempdir, create=True)
#     html_str = """
#         <html>
#         <body>
#         <p>a</p>
#         <a href="/b.html">b_link</a>
#         <a href="/c.html">c_link</a>
#         </body>
#         </html>
#     """
#     soup = BeautifulSoup(html_str, "html.parser")
#     with open(f"{rawdir}/a.html", "w") as f:
#         f.write(html_str)
#     meta.add_file(f"{rawdir}/a.html", group="raw")
#     html_str = """
#         <html>
#         <body>
#         <p class="b">In B</p>
#         </body>
#         </html>
#     """
#     with open(f"{rawdir}/b.html", "w") as f:
#         f.write(html_str)
#     meta.add_file(f"{rawdir}/b.html", group="raw")
#     html_str = """
#         <html>
#         <body>
#         <p class="c">In C</p>
#         </body>
#         </html>
#     """
#     with open(f"{rawdir}/c.html", "w") as f:
#         f.write(html_str)
#     meta.add_file(f"{rawdir}/c.html", group="raw")

#     tk = OneDeepMerger(meta=meta, in_folder="raw", out_folder=f"{tempdir}/out")
#     newsoup = tk.process(soup, url="http://localhost/index.html")
#     belement = newsoup.find_all("p", {"class": "b"})

#     self.assertEqual(len(belement), 1)
#     self.assertEqual(str(belement[0]), '<p class="b">In B</p>')


if __name__ == "__main__":
    test_method = "test_one_deep_multiple"
    if not test_method:
        unittest.main()
    else:
        ## test one method
        suite = unittest.TestSuite()
        suite.addTest(TestOneDeep(test_method))
        runner = unittest.TextTestRunner()
        runner.run(suite)
