import http.server
import os
import sys
import tempfile
import threading
from pathlib import Path
from threading import Thread

import pytest
from qai.core import Meta

from qai.scraper.scrapers.scraper import Scraper

PORT = 8003


class TempDirHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, temp_dir, *args, **kwargs):
        self.temp_dir = temp_dir
        super().__init__(*args, directory=self.temp_dir, **kwargs)


@pytest.fixture(scope="module")
def setup_server():
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
    temp_dir = tempfile.TemporaryDirectory()
    with open(f"{temp_dir.name}/test.html", "w") as f:
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
    with open(f"{temp_dir.name}/a.html", "w") as f:
        f.write(html_str)

    handler = lambda *args, **kwargs: TempDirHandler(temp_dir.name, *args, **kwargs)
    server = http.server.HTTPServer(("localhost", PORT), handler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()

    yield temp_dir

    thread = Thread(target=server.server_close)
    thread.start()
    temp_dir.cleanup()


def test_scrape(setup_server):
    temp_dir = setup_server
    s = Scraper()
    group = "testgroup"
    url = f"http://localhost:{PORT}/test.html"

    with tempfile.TemporaryDirectory() as temp_dir:
        dest_dir = os.path.join(str(Path(temp_dir).absolute()), group)
        meta = Meta.from_dir(temp_dir, create=True)
        meta.set_save_location("metadata.json")
        meta.save(overwrite=True)

        s.scrape(url, dest_dir=dest_dir, max_depth=-1, group=group, meta=meta)
        name = s.url_to_local_name(url)
        name2 = name.replace("test.html", "a.html")
        ## Test files exist
        assert os.path.exists(f"{dest_dir}/{name}")
        assert os.path.exists(f"{dest_dir}/{name2}")

        ## Test the meta
        meta = Meta.from_dir(".")
        g = meta.get_dir(f"{group}")
        f = g.get_file(name)
        assert os.path.exists(g.path)
        assert os.path.exists(f.path)


if __name__ == "__main__":
    pytest.main([sys.argv[0]])
