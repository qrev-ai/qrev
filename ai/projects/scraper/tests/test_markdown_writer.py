import sys
import os
import pytest
from bs4 import BeautifulSoup
from qai.core import Meta
from qai.scraper.processors.markdown_writer import MarkdownWriter


def test_write_markdown(tmp_path):
    html_str = """
        <h3>
        A <em><b>B</b></em> C <i>D</i> E
        F <b>G</b> H <i>I</i> J  .
        </h3>
    """
    expected_output = "###  A _**B** _ C _D_ E F **G** H _I_ J . \n"
    soup = BeautifulSoup(html_str, "html.parser")
    meta = Meta.from_dir(tmp_path, create=True)
    file_path = meta.path / "simplified_testing.md"
    proc = MarkdownWriter(file_name=file_path, meta=meta)
    proc.process(soup)
    assert os.path.exists(file_path)
    assert os.path.exists(meta.get_file("simplified_testing.md").path)

    with open(file_path, "r") as f:
        assert expected_output == f.read()


if __name__ == "__main__":
    pytest.main([sys.argv[0]])
