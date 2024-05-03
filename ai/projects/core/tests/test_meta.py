import json
import os
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path

from qai.core import Meta, MetaObj, MetaOptions, MetaUri

test_dir = Path(__file__).parent
data_dir = (test_dir / "data").resolve()
cur_dir = Path(os.curdir).absolute()


class TestMeta(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        pass

    @classmethod
    def tearDownClass(cls) -> None:
        pass

    def test_load_metadata(self):
        root_dir, meta = Meta.get_folder_and_meta(data_dir / "websites/test_website")
        self.assertEqual(Path(root_dir), data_dir / "websites/test_website/20231229-000000")
        self.assertTrue(os.path.exists(meta))
        self.assertTrue(os.path.exists(root_dir))
        self.assertEqual(os.path.basename(meta), "metadata.json")

    def test_get_meta_from_most_recent_dir(self):
        pth = data_dir / "websites/test_website"
        meta = Meta.from_most_recent(pth)
        with open(pth / "20231229-000000" / "metadata.json") as f:
            data = json.load(f)
        self.assertEqual(meta.root, meta.abs(data["root"]))

    def test_get_meta_from_directory(self):
        pth = data_dir / "websites/test_website/20231229-000000"
        meta = Meta.from_directory(pth)
        self.assertEqual(meta.root, pth)

    def test_get_meta_get_file(self):
        meta = Meta.from_most_recent(data_dir / "websites/test_website")
        f = meta.get_file_meta("lorem.html", group="raw")
        self.assertTrue(isinstance(f, MetaObj))
        self.assertEqual(f._path, data_dir / "websites/test_website/20231229-000000/raw/lorem.html")
        self.assertEqual(f.title, "Example")

    def test_meta_from_dict(self):
        d = {"a": 1, "b": 2}
        meta = Meta(**d)
        self.assertEqual(meta["a"], 1)
        self.assertEqual(meta["b"], 2)
        self.assertIsNone(meta.root)

    def test_meta_from_dict2(self):
        d = {"a": 1, "b": 2}
        meta = Meta(d)
        self.assertEqual(meta["a"], 1)
        self.assertEqual(meta["b"], 2)
        self.assertIsNone(meta.root)

    def test_meta_from_dict_with_root(self):
        d = {"a": 1, "b": 2}
        root = "z"
        meta = Meta(_root=root, **d)
        self.assertEqual(meta["a"], 1)
        self.assertEqual(meta["b"], 2)
        self.assertEqual(str(meta.root), "z")

    def test_from_directory(self):
        with tempfile.TemporaryDirectory() as tmpdirname:
            meta_dir = f"{tmpdirname}/meta_root"
            meta = Meta.from_directory(dir_path=meta_dir, create=True)
            self.assertTrue(os.path.exists(meta.root))
            self.assertTrue(os.path.exists(meta.meta_file))
            meta["a"] = 1
            meta.save()
            meta2 = Meta.from_directory(meta_dir)
            self.assertEqual(meta2["a"], 1)
            self.assertEqual(meta.root, meta2.root)
            self.assertEqual(meta.meta_file, meta2.meta_file)

    def test_from_most_recent_no_timestamp(self):
        with tempfile.TemporaryDirectory() as tmpdirname:
            meta_dir = f"{tmpdirname}/meta_root"
            meta = Meta.from_directory(dir_path=meta_dir, create=True)
            self.assertTrue(os.path.exists(meta.root))
            self.assertTrue(os.path.exists(meta.meta_file))
            meta["a"] = 1
            meta.save()
            meta2 = Meta.from_directory(meta_dir)
            self.assertEqual(meta2["a"], 1)
            self.assertEqual(meta.root, meta2.root)
            self.assertEqual(meta.meta_file, meta2.meta_file)

    def test_from_most_recent_timestamp(self):
        with tempfile.TemporaryDirectory() as tmpdirname:
            meta_dir = f"{tmpdirname}/meta_root"
            meta = Meta.from_most_recent(dir_path=meta_dir, create=True)
            self.assertTrue(os.path.exists(meta.root))
            self.assertTrue(os.path.exists(meta.meta_file))
            meta["a"] = 1
            meta.save()
            meta2 = Meta.from_most_recent(meta_dir)
            self.assertEqual(meta2["a"], 1)
            self.assertEqual(meta.root, meta2.root)
            self.assertEqual(meta.meta_file, meta2.meta_file)

    def test_metaobj_subclassing(self):
        @dataclass
        class MyMeta(MetaObj):
            a: int = 1

        meta = MyMeta()
        self.assertEqual(meta.__json__(), {"a": 1})

    def test_metaobj_subclassing_default_no_default_value(self):
        @dataclass
        class MyMeta(MetaObj):
            a: int
            b: int = 1

        meta = MyMeta(a=1)
        self.assertEqual(meta.__json__(), {"a": 1, "b": 1})

    def test_metauri_subclassing_default_no_default_value(self):
        @dataclass
        class MyMeta(MetaUri):
            a: int
            b: int = 1

        meta = MyMeta(_uri="a", a=1)
        self.assertEqual(meta.__json__(), {"_uri": "a", "a": 1, "b": 1})

    # def test_metauri_subclassing_default_no_default_extra_args(self):
    #     @dataclass
    #     class MyMeta(MetaUri):
    #         a: int
    #         b: int = 1

    #     meta = MyMeta(_uri="a", a=1, c=1)
    #     self.assertEqual(meta.__json__(), {"_group": None, "_uri": "a", "a": 1, "b": 1})

    def test_metaobj_subclass(self):
        @dataclass
        class MyMeta(MetaUri):
            a: int = 1

        with tempfile.TemporaryDirectory() as tmpdirname:
            meta = Meta.from_most_recent(tmpdirname, create=True)
            self.assertTrue(os.path.exists(meta.root))

            os.makedirs(f"{meta.root}/raw", exist_ok=True)
            m = MyMeta(_uri="raw/a.json")

            meta.add_file_meta("raw", m)
            with open(f"{meta.root}/{m._uri}", "w") as f:
                json.dump(m.__json__(), f)
            self.assertTrue(os.path.exists(f"{meta.root}/metadata.json"))
            self.assertTrue(os.path.exists(f"{meta.root}/raw/a.json"))
            cls = MyMeta
            o = cls(**{"_uri": "raw/a.json", "a": 1})

            self.assertEqual(type(o), MyMeta)

    def test_metaobj_subclass_get_file_meta(self):
        @dataclass(init=False)
        class MyMeta(MetaUri):
            a: int = 1

        with tempfile.TemporaryDirectory() as tmpdirname:
            # tmpdirname = "tmpdir"
            meta = Meta.from_most_recent(tmpdirname, create=True)
            self.assertTrue(os.path.exists(meta.root))

            os.makedirs(f"{meta.root}/raw", exist_ok=True)
            pth = str(Path(f"{meta.root}/raw/a.json").absolute())
            m = MyMeta(_uri=pth)

            meta.add_file_meta("raw", m)
            with open(pth, "w") as f:
                json.dump(m.__json__(), f)
            self.assertTrue(os.path.exists(f"{meta.root}/metadata.json"))
            self.assertTrue(os.path.exists(f"{meta.root}/raw/a.json"))
            o = meta.get_file_meta("a.json", group="raw", cls=MyMeta)
            self.assertEqual(type(o), MyMeta)
            self.assertEqual(o._uri, pth)
            self.assertEqual(o.a, 1)

    def test_metaobj_subclass_get_file_meta_2(self):
        @dataclass
        class MyMeta(MetaUri):
            a: int = 1

        with tempfile.TemporaryDirectory() as tmpdirname:
            meta = Meta.from_most_recent(tmpdirname, create=True)
            self.assertTrue(os.path.exists(meta.root))

            os.makedirs(f"{meta.root}/raw", exist_ok=True)
            pth = str(Path(f"{meta.root}/raw/a.json").absolute())
            m = MyMeta(_uri=pth)

            meta.add_file_meta("raw", m)
            with open(pth, "w") as f:
                json.dump(m.__json__(), f)
            self.assertTrue(os.path.exists(f"{meta.root}/metadata.json"))
            self.assertTrue(os.path.exists(f"{meta.root}/raw/a.json"))
            o = meta.get_file_meta("a.json", group="raw", cls=MetaObj)

            self.assertEqual(o._uri, pth)
            self.assertEqual(o.a, 1)

    def test_metaobj_get_file(self):
        @dataclass
        class MyMeta(MetaUri):
            a: int = 1

        with tempfile.TemporaryDirectory() as tmpdirname:
            meta = Meta.from_directory(tmpdirname, create=True)
            self.assertTrue(os.path.exists(meta.root))
            name = "f1.json"
            with open(f"{meta.root}/{name}", "w") as f:
                json.dump({}, f)
            m = MyMeta(_uri=name)
            meta.add_file(f"{meta.root}/{name}", group="raw", meta=m)
            ## check to see if file is added
            f = meta.get_file(name, group="raw")
            self.assertEqual(str(f), str(f"{meta.root}/raw/{name}"))
            self.assertTrue(os.path.exists(f))
            ## check to see if file meta was returned
            self.assertEqual(f.metadata.a, 1)

    def test_metaobj_get_files(self):
        """Test that files are returned"""

        @dataclass
        class MyMeta(MetaUri):
            a: int = 1

        with tempfile.TemporaryDirectory() as tmpdirname:
            meta = Meta.from_directory(tmpdirname, create=True)
            self.assertTrue(os.path.exists(meta.root))
            name = "f1.json"
            with open(f"{meta.root}/{name}", "w") as f:
                json.dump({}, f)
            m = MyMeta(_uri=name)
            meta.add_file(f"{meta.root}/{name}", group="raw", meta=m)
            ## check to see if file is added
            files = meta.get_files(group="raw")
            self.assertEqual(len(files), 1)
            f = files[0]
            self.assertEqual(str(f), str(f"{meta.root}/raw/{name}"))
            self.assertTrue(os.path.exists(f))
            ## check to see if file meta was returned
            self.assertEqual(f.metadata.a, 1)

    def test_metaobj_get_files_meta(self):
        ## test that meta for each file is returned
        @dataclass
        class MyMeta(MetaUri):
            a: int = 1

        with tempfile.TemporaryDirectory() as tmpdirname:
            meta = Meta.from_directory(tmpdirname, create=True)
            self.assertTrue(os.path.exists(meta.root))
            name = "f1.json"
            with open(f"{meta.root}/{name}", "w") as f:
                json.dump({}, f)
            m = MyMeta(_uri=name)
            meta.add_file(f"{meta.root}/{name}", group="raw", meta=m)
            ## check to see if file is added
            files = meta.get_files_meta(group="raw", cls=MyMeta)
            self.assertEqual(len(files), 1)
            f = files[0]
            self.assertEqual(type(f), MyMeta)
            self.assertEqual(f._uri, name)
            self.assertEqual(f.a, 1)

    def test_metaobj_get_files_with_subfolders(self):

        with tempfile.TemporaryDirectory() as tmpdirname:
            meta = Meta.from_directory(tmpdirname, create=True)
            os.makedirs(f"{meta.root}/raw", exist_ok=True)
            self.assertTrue(os.path.exists(meta.root))
            name = "f1.json"
            expected_uri = "a/f1.json"
            file_path = f"{meta.root}/{name}"
            with open(file_path, "w") as f:
                json.dump({}, f)
            m = MetaUri(_uri=expected_uri)

            meta.add_file(file_path, group="raw", meta=m)
            meta.save()
            ## check to see if file is added
            files = meta.get_files_meta(group="raw", cls=MetaUri, recursive=True)
            self.assertEqual(len(files), 1)
            f = files[0]
            self.assertEqual(f._uri, expected_uri)

    def test_metaobj_get_files_with_subfolders2(self):

        with tempfile.TemporaryDirectory() as tmpdirname:
            meta = Meta.from_directory(tmpdirname, create=True)
            os.makedirs(f"{meta.root}/raw", exist_ok=True)
            self.assertTrue(os.path.exists(meta.root))
            name = "f1.json"
            expected_uri = "a/f1.json"
            file_path = f"{meta.root}/{name}"
            with open(file_path, "w") as f:
                json.dump({}, f)

            meta.add_file(file_path, group="raw", uri=expected_uri)
            meta.save()
            ## check to see if file is added
            files = meta.get_files_meta(group="raw", cls=MetaUri, recursive=True)
            self.assertEqual(len(files), 1)
            f = files[0]
            self.assertEqual(f._uri, expected_uri)


if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestMeta(testmethod))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
