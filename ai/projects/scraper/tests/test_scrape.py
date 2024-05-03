import http.server
import os
import tempfile
import threading
import unittest
from pathlib import Path
from threading import Thread

from qai.core import Meta
from qai.scraper.scrapers.scraper import Scraper

PORT = 8003


class TestFilter(unittest.TestCase):
    @classmethod
    def serve(cls):
        try:
            cls.httpd.serve_forever()
        finally:
            cls.httpd.server_close()

    @classmethod
    def setUpClass(cls) -> None:
        html_str = """
            <html>
            <h1>HTML Ipsum Presents</h1>
            <p>
            <a href="a.html">My link</a>
            </p>

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
        ## Create a temporary directory that we will clean up in teadDown
        cls.temp_dir = tempfile.TemporaryDirectory()
        with open(f"{cls.temp_dir.name}/test.html", "w") as f:
            f.write(html_str)

        html_str = """
            <html>
            <h1>HTML Ipsum Presents</h1>
            <ol class="a">
                <li>1</li>
                <li>2</li>
            </ol>
            </html>            
        """
        with open(f"{cls.temp_dir.name}/a.html", "w") as f:
            f.write(html_str)

        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=cls.temp_dir.name, **kwargs)

        cls.httpd = http.server.HTTPServer(("localhost", PORT), Handler)
        httpd_thread = threading.Thread(target=cls.httpd.serve_forever)
        httpd_thread.daemon = True
        httpd_thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        thread = Thread(target=cls.httpd.server_close)
        thread.start()

    def test_scrape(self):
        s = Scraper()
        group = "testgroup"
        url = f"http://localhost:{PORT}/test.html"

        with tempfile.TemporaryDirectory() as temp_dir:
            dest_dir = os.path.join(str(Path(temp_dir).absolute()), group)

            os.makedirs(dest_dir, exist_ok=True)
            s.scrape(url, dest_dir=dest_dir, max_depth=-1, group=group)
            name = s.url_to_local_name(url)
            name2 = name.replace("test.html", "a.html")
            ## Test files exist
            self.assertTrue(os.path.exists(f"{dest_dir}/{name}"))
            self.assertTrue(os.path.exists(f"{dest_dir}/{name2}"))

            ## Test the meta
            meta = Meta.from_directory(temp_dir)
            self.assertTrue(os.path.exists(meta.get_file(name, group)))
            self.assertTrue(os.path.exists(meta.get_file(name2, group)))


if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestFilter(testmethod))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
