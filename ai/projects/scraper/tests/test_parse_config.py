import os
import tempfile
import tomllib as toml
import unittest
from pprint import pprint

cfg_str = """
[[pipeline]]
k1 = 1
k2 = 2

pipeline = ["Keep1", "Remove", "Keep2"]

[[processors]]
name = "Keep1"
k1 = 1

[[processors]]
name = "Remove"
k1 = 1

[[processors]]
name = "Keep2"
k1 = 1

[[urls]]
url = "a.com"
pipeline = ["Keep1", "Keep2"]

[urls.processors.Keep1]
k1 = 3
k2 = 5

[[urls]]
url = "b.com"

"""


class TestParseConfig(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass

    def test_parse_config(self):
        with tempfile.TemporaryFile() as fp:
            fp.write(cfg_str.encode())
            fp.seek(0)
            data = toml.load(fp)
        a = data["urls"][0]
        self.assertEqual(a["url"], "a.com")
        keys = list(a.keys())
        self.assertEqual(keys[2], "processors")


if __name__ == "__main__":
    unittest.main()
