import glob
import json
import os
import re
import shutil
import tempfile
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, UTC
from pathlib import Path
from typing import Any, Tuple, Type, TypeVar
from urllib.parse import urlsplit

import json_fix as json_fix

default_meta_file = "metadata.json"
timeformat = "%Y%m%d-%H%M%S"

ROOT_GROUP = "root_group"


class MetaObj(dict):
    exclude_members = set(["_meta"])

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

    def __json__(self):
        ## create a json for all non private members
        obj = {}
        for k, v in self.__dict__.items():
            if not k.startswith("__") and not callable(k) and not k in self.exclude_members:
                ## Path objects need to be converted to strings
                if isinstance(v, Path):
                    v = str(v)
                obj[k] = v
        return obj

    def __str__(self):
        return str(self.__json__())


@dataclass(kw_only=True)
class MetaUri(MetaObj):
    exclude_members = set(["_meta", "_group", "_path"])

    _uri: str
    _path: Path = None
    _group: str = None
    _meta: "Meta" = None

    def __init__(
        self,
        _uri: str,
        _path: Path = None,
        _group: str = None,
        _meta: "Meta" = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._uri = _uri
        self._path = _path or None
        self._group = _group or None
        self._meta = _meta or None

    def full_path(self):
        if not self._meta:
            return self._uri
        if self._group:
            return self._meta._path_join(self._group, self._uri)
        return self._meta.abs(self._uri)

    def __str__(self):
        return str(self._uri)

    def __repr__(self):
        return str(self._uri)

    def __fspath__(self):
        """
        Return the file system path representation.
        For compatibility with os.PathLike interface.
        """
        return str(self._path)


@dataclass
class MetaFile(MetaObj):
    path: str
    metadata: MetaUri

    def __str__(self):
        return str(self.path)

    def __repr__(self):
        return str(self.path)

    def __fspath__(self):
        """
        Return the file system path representation.
        For compatibility with os.PathLike interface.
        """
        return str(self.path)


C = TypeVar("C", bound="MetaUri")


def url_with_path(url):
    split_url = urlsplit(url)
    url = f"{split_url.scheme}://{split_url.netloc}{split_url.path}"
    if url.endswith("/"):
        url = url[:-1]
    return url


@dataclass
class MetaOptions:
    create_root: bool = True
    root_from_file_location: bool = True


@dataclass
class Meta(dict):
    """
    A class to represent the metadata of a collection of files under a given directory.
    The structure is as follows:
    - root: the directory where the files and groups are located
        - meta.json: a json file with the metadata for the folders and files
        - group (optional): the group where the files are located
            - file1
            - file2
            - ...
        - group2 (optional): another group where the files are located
            - file3
            - file4
            - ...
    """

    _root: str = None
    _meta_file: str = None
    _time_str: str = None
    created_at: datetime = field(default=lambda: datetime.now(UTC))
    options: MetaOptions = None
    is_root_temp: bool = False

    def __init__(
        self,
        initial_dict: dict = None,
        options: MetaOptions = None,
        use_timed_group: bool = False,
        *args,
        **kwargs,
    ):
        self.options = options or MetaOptions()
        kwargs.update(initial_dict or {})
        super().__init__(*args, **kwargs)
        self.__dict__ = self
        self._init(use_timed_group, *args, **kwargs)

    def __post_init__(self):
        self._init()

    def _init(self, use_timed_group: bool = False, *args, **kwargs):
        # if self.root and self.meta_file is None:
        #     self.meta_file = Path(os.path.join(self.root, default_meta_file))
        # if isinstance(self.root, str):
        #     self.root = Path(self.root)

        # print("here", self.root)
        # print("meta_file", self.meta_file)
        if self.meta_file:
            if os.path.exists(self.meta_file):
                self.load()
            elif self.options.create_root:
                os.makedirs(self.root, exist_ok=True)
                # self.save(indent=2)

        if isinstance(self._root, Path):
            self._root = str(self._root.absolute())

        # print("here2", self.root)
        # print("INIT", self.root, self.meta_file, self.created_at)

    def __del__(self):
        if self.is_root_temp:
            shutil.rmtree(self.root)

    @property
    def root(self):
        return None if self._root is None else Path(self._root)

    @root.setter
    def root(self, value):
        if isinstance(value, Path):
            value = str(value.absolute())
        if isinstance(value, MetaObj):
            value = str(Path(str(value)).absolute())
        self._root = value

    @property
    def meta_file(self):
        return None if self._meta_file is None else Path(self._meta_file)

    def __json__(self):
        # print("__json__ here!!")
        obj: Meta = self.copy()
        ## convert Path to string for any members that are Paths
        for k, v in obj.items():
            if isinstance(v, Path):
                obj[k] = str(v)
        # obj["root"] = str(obj["root"])
        # obj["meta_file"] = str(obj["meta_file"])
        return obj

    def abs(self, s: str):
        return Path(self.root / s).absolute()

    @property
    def strdate(self):
        return self.created_at.strftime()

    @staticmethod
    def create_most_recent(dir_path: str) -> "Meta":
        dir_path = os.path.expanduser(dir_path)
        now = datetime.utcnow().strftime(timeformat)
        time_path = os.path.join(dir_path, now)
        return Meta.from_directory(time_path, create=True)

    def get_group_meta(self, group: str = None) -> dict[str, Any]:
        group = group or ROOT_GROUP

        if not "_groups" in self:
            self["_groups"] = defaultdict(dict)
        if not group in self["_groups"]:
            self["_groups"][group] = {}
        return self["_groups"][group]

    def get_uri_meta(self, group: str) -> dict[str, Any]:
        groupmeta = self.get_group_meta(group)
        if not "_uris" in groupmeta:
            groupmeta["_uris"] = {}
        return groupmeta["_uris"]

    @staticmethod
    def get_folder_and_meta(dir_path: str) -> Tuple[str, str]:
        dir_path = os.path.expanduser(dir_path)
        rootdir = Meta.get_most_recent_folder(dir_path)
        if not os.path.exists(rootdir):
            raise FileNotFoundError(f"Could not find {rootdir}")
        meta_file = os.path.abspath(os.path.join(rootdir, "..", default_meta_file))

        if not os.path.exists(meta_file):
            meta_file = os.path.join(rootdir, default_meta_file)
            if not os.path.exists(meta_file):
                raise FileNotFoundError(f"Could not find {meta_file}")
        return rootdir, meta_file

    @staticmethod
    def get_most_recent_folder(dir_path: str | Path) -> str:
        """
        Get the most recent folder in dir_path with the format YYYYMMDD-HHMMSS
        if no such folder exists, return dir_path

        """
        if isinstance(dir_path, str) and dir_path.startswith("~"):
            dir_path = os.path.expanduser(dir_path)
        files = glob.glob(f"{dir_path}/*")
        files = sorted(files)
        files = [f for f in files if re.search(r"[0-9]{8,8}-[0-9]{6,6}", f) is not None]
        try:
            return str(files[-1])
        except IndexError:
            raise IndexError(f"Could not find a folder with the correct format in {dir_path}")

    @staticmethod
    def from_most_recent(dir_path: str | Path, create: bool = False) -> "Meta":
        if isinstance(dir_path, str) and dir_path.startswith("~"):
            dir_path = os.path.expanduser(dir_path)
        now = datetime.now(UTC).strftime(timeformat)
        try:
            rootdir = Meta.get_most_recent_folder(dir_path)
        except IndexError:
            rootdir = os.path.join(
                dir_path,
            )
            os.makedirs(rootdir, exist_ok=True)
        timestr = rootdir[-len(now) :]
        meta = Meta.from_directory(dir_path=rootdir, create=create)
        meta._timestr = timestr
        return meta

    @staticmethod
    def create_ephemeral() -> "Meta":
        ## create a temporary directory that will not be deleted when the context manager exits
        tempdir = tempfile.mkdtemp()
        meta = Meta.from_directory(tempdir, create=True)
        meta.is_root_temp = True
        return meta

    @staticmethod
    def from_directory(dir_path: str | Path, create: bool = False) -> "Meta":
        if isinstance(dir_path, str):
            dir_path = Path(dir_path)
        meta_path = dir_path / "metadata.json"

        if not os.path.exists(meta_path):
            if not create:
                raise Exception(
                    f"No metadata.json was found in '{dir_path}'. "
                    "You can create by passing create=True"
                )

            os.makedirs(os.path.dirname(meta_path), exist_ok=True)
            if not os.path.exists(meta_path):
                ## write a metadata.json
                with open(meta_path, "w") as f:
                    json.dump({}, f)
        return Meta(_root=dir_path.absolute(), _meta_file=str(meta_path))

    def save(self, file_name: str = None, indent: int = 2, **kwargs):
        if not file_name and not self.root:
            raise ValueError("No file_name or root directory to save the metadata")
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            json.dump(self, f, indent=indent, **kwargs)
            os.rename(f.name, self.meta_file)

    # def _members_to_path(self):
    #     for k in ["root", "meta_file"]:
    #         try:
    #             if self[k] is None:
    #                 continue
    #         except:
    #             continue
    #         if isinstance(self[k], str):
    #             self[k] = Path(self[k])

    def load(self, file_name: str = None):
        if not file_name and not self.root:
            raise ValueError("No file_name or root directory to load the metadata")
        file_name = file_name or self.meta_file
        with open(file_name, "r") as f:
            self.update(json.load(f))

    # def get_file(self, file_name: str, group=None, cls: Type["MetaObj"] = None) -> "MetaObj":
    # def get_file(self, file_name: str, group=None, cls: Type["MetaObj"] = None) -> __qualname__:
    def get_file_meta(
        self, file_name: str, group: str = None, cls: Type[C] = MetaUri, create: bool = False
    ) -> C:
        group = group or ROOT_GROUP

        # print("GET FILE", file_name, group, cls)
        # if group is None:
        #     if not "/" in file_name:
        #         group = ROOT_GROUP
        #     group, file_name = file_name.split("/", maxsplit=1)[0]
        group_path = self.get_group(group)
        urimeta = self.get_uri_meta(group)
        path = Path(self._path_join(group, file_name)).absolute()
        rel_path = os.path.relpath(str(path), str(group_path))
        if file_name in urimeta:
            key = file_name
        elif rel_path in urimeta:
            key = rel_path
        elif str(path) in urimeta:
            key = str(path)
        elif path.name in urimeta:
            key = path.name
        else:
            if not create:
                raise FileNotFoundError(f"Could not find {file_name} meta in {group}")
            key = rel_path
            self.get_uri_meta(group)[key] = {"_uri": key}

        if not os.path.exists(path):
            raise FileNotFoundError(f"Could not find file {path}")
        ojson = urimeta[key]
        for k in ["_uri", "_path", "_group", "_meta"]:
            ojson.pop(k, None)

        return cls(_uri=key, _path=path.absolute(), _meta=self, _group=group, **ojson)

    def get_files_meta(self, group: str, cls: Type[C] = None, recursive: bool = True) -> list[C]:
        group_path = self.get_group(group)
        fs = []
        if cls is None:
            cls = MetaUri
        for f in glob.glob(f"{group_path}/**", recursive=recursive):
            if os.path.isfile(f):
                furi = f.removeprefix(group_path + "/")
                o = self.get_file_meta(furi, group, cls)
                fs.append(o)
        return fs

    def get_files(self, group=None) -> list[MetaFile]:
        dir_path = self.get_group(group)
        return [
            self.get_file(f, group)
            for f in glob.glob(f"{dir_path}/**", recursive=True)
            if os.path.isfile(f)
        ]

    def get_file(self, file_name: str, group=None) -> MetaFile:
        if group is None:
            if not "/" in file_name:
                full_path = os.path.join(self.root, file_name)
                if not os.path.exists(full_path):
                    raise FileNotFoundError(f"Could not find file {full_path}")
                return full_path
                # raise ValueError(f"group must be a valid path")
            group, file_name = file_name.split("/", maxsplit=1)[0]
        full_path = self._path_join(group, file_name)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Could not find file {full_path}")
        muri = self.get_file_meta(file_name, group)
        return MetaFile(path=full_path, metadata=muri)

    def relative_to(self, path: str | Path, other: str | Path = None) -> str:
        """Returns the path relative to the root, or other if provided."""
        if other is None:
            other = self.root
        return str(Path(path).relative_to(other))

    def add_file_meta(self, group: str = None, values: dict | MetaUri = None):
        if values is None:
            raise ValueError("No values to add")

        if isinstance(values, MetaUri):
            metauri = values
        else:
            metauri = MetaUri(**values)
        submeta = self.get_group_meta(group)
        if not "_uris" in submeta:
            submeta["_uris"] = {}
        vals = metauri.__dict__
        if metauri._uri in submeta["_uris"]:
            submeta["_uris"][metauri._uri].update(vals)
        else:
            submeta["_uris"][metauri._uri] = vals

    def add_tag(self, tags: str | list[str], uri: str | Path, group: str = None):
        if isinstance(tags, str):
            tags = [tags]
        meta = self.get_file_meta(uri, group, create=True)
        if not "_tags" in meta:
            # meta["_tags"] = []
            meta.update({"_tags": []})
        meta["_tags"].extend(tags)
        self.add_file_meta(group, meta)

    def add_file(
        self, src_path: str | Path, group: str, uri: str | Path = None, meta: MetaUri = None
    ):
        """
        args:
        src_path: the source path of the file to copy
        group: the group to copy the file to
        uri: the path of the file relative to the group,
            this functionally sets the uri of the file
        """
        if isinstance(src_path, str):
            src_path = Path(src_path)
        if not os.path.exists(src_path):
            raise FileNotFoundError(f"Could not find file {src_path}")
        if meta is None:
            if uri is None:
                uri = src_path.name
            meta = MetaUri(_uri=uri)
        full_dest = Path(self._path_join(group, meta._uri))
        full_dest_dir = os.path.dirname(str(full_dest))
        os.makedirs(full_dest_dir, exist_ok=True)

        try:
            if src_path.absolute() != full_dest.absolute():
                shutil.copy(src_path, full_dest)
            self.add_file_meta(group, meta)
        except Exception as e:
            raise e

    def get_group(self, group: str = None, create: bool = False) -> str:
        """
        Get the full path of the location of the group, creating it if it does not exist
        """
        if group and not os.path.exists(self._path_join(group)):
            if create:
                os.makedirs(self._path_join(group))
        if group is None or group == ROOT_GROUP:
            return self.root

        return self._path_join(group)

    def _path_join(self, group: str, *args) -> str:
        if group is None or group == ROOT_GROUP:
            return os.path.join(self.root, *args)
        return os.path.join(self.root, group, *args)

    def has_directory(self, group: str = None):
        if group is None:
            return os.path.exists(self.root)
        return os.path.exists(self._path_join(group))
