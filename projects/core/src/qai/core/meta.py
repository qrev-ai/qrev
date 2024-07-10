import inspect
import json
import os
import sys
import tempfile
from collections.abc import Iterator
from datetime import datetime, timezone
from enum import StrEnum
from importlib import import_module
from pathlib import Path, PurePath
from typing import Any, Dict, List, Optional, Self, TextIO, Type, Union
from uuid import UUID, uuid4

from pydantic import (
    BaseModel,
    Field,
    PrivateAttr,
    ValidationInfo,
    field_serializer,
    field_validator,
    model_validator,
)

from qai.core.utils.class_utils import get_full_class_name

sentinel = object()


class SearchDepth(StrEnum):
    deepest = "deepest"
    shallow = "shallow"
    all = "all"


class FileType(StrEnum):
    all = "all"
    file = "file"
    dir = "dir"


class MetaBase(BaseModel):
    """
    Base metadata class
    """

    id: UUID = Field(default_factory=uuid4)
    _parent: Optional[Self] = PrivateAttr(default=None)
    parent_id: Optional[UUID] = None
    class_name: Optional[str] = None
    metadata: dict[str, Any] = None
    origin_ids: list[UUID] = None
    _origins: Optional[Self] = PrivateAttr(default=None)

    def __init__(self, **data):
        super().__init__(**data)
        if not self._parent:
            self._parent = data.get("_parent")
        if not self._origins:
            self._origins = data.get("_origins")


    def model_post_init(self, _) -> None:
        if not self.class_name:
            self.class_name = get_full_class_name(self.__class__)

    @model_validator(mode="before")
    def set_class_type(cls, values: Dict[str, Any]):
        ## get the fully qualified module and name
        class_name = get_full_class_name(cls)
        values["class_name"] = class_name
        return values

    @field_serializer("parent_id")
    def serialize_parent_id(self, value: UUID) -> str | None:
        return str(value) if value else None

    @field_validator("parent_id")
    def validate_parent_id(cls, value):
        if isinstance(value, str):
            return UUID(value)
        return value

    @field_serializer("id")
    def serialize_id(self, value: UUID) -> str:
        return str(value) if value else None

    @field_validator("id")
    def validate_id(cls, value):
        if isinstance(value, str):
            return UUID(value)
        return value

    @field_serializer("origin_ids")
    def serialize_origin_ids(self, v: list[UUID]) -> list[str]:
        if not v:
            return v
        return [str(oid) for oid in v]

    @classmethod
    def deserialize(cls, data: dict[str, Any]):
        module, class_name = data.pop("class_name").rsplit(".", 1)
        class_ = getattr(import_module(module), class_name)
        # class_ = globals().get(class_name)
        if class_:
            instance = class_(**data)
            return instance
        else:
            raise ValueError(f"Unknown class type: {class_name}")

    def add_metadata(self, key: str, value: Any):
        if not self.metadata:
            self.metadata = {}
        self.metadata[key] = value

    def add_origin(self, origin: "MetaBase") -> UUID:
        """
        Add an origin to the metadata
        Args:
            origin (str | UUID | MetaBase): The origin to add
        Returns:
            UUID: The UUID of the origin
        """
        # if isinstance(origin, str):
        #     v = UUID(origin)
        # elif isinstance(origin, UUID):
        #     v = origin
        # elif isinstance(origin, MetaBase):
        #     v = origin.id
        if not self.origin_ids:
            self.origin_ids = []
        self.origin_ids.append(origin.id)
        if not self._origins:
            self._origins = []
        self._origins.append(origin)
        return origin.id

    def get_sources(self, depth: SearchDepth = SearchDepth.all) -> Iterator["MetaBase"]:
        """
        Get all sources of the metadata
        """
        if not self._origins:
            return None
        if depth == SearchDepth.shallow:
            yield from self._origins
        elif depth == SearchDepth.deepest:
            ## Only get the final sources, ones without any other origins
            sources = self.get_sources(SearchDepth.all)
            for s in sources:
                if not s._origins:
                    yield s
        else:
            yield from self._origins
            o: MetaBase
            for o in self._origins:
                yield from o.get_sources(depth)


class MetaPath(MetaBase):
    """
    Metadata class for a file or directory.

    """

    path: Optional[Path] = None
    _is_file: bool
    _is_dir: bool

    def __init__(self, **data):
        super().__init__(**data)
        if self.path:
            if isinstance(self.path, str):
                self.path = Path(self.path)
            if self.path.is_absolute() and self._parent:
                print(f"parent_id: {self.parent_id}, parent: {self._parent}")

    @property
    def is_file(self) -> bool:
        return self._is_file

    @property
    def is_dir(self) -> bool:
        return self._is_dir

    def exists(self) -> bool:
        if not self.path:
            raise ValueError(f"Path not set: {self}")
        return self.path.exists()

    def relative_to(self, other: Self | None = None) -> Path:
        if not self.path:
            raise ValueError(f"Path not set: {self}")
        if not other:
            if not self._parent:
                raise ValueError(f"Cannot determine relative path without a parent: {self}")
            other = self._parent
        return self.path.relative_to(other.path)

    @field_serializer("path")
    def serialize_path(self, path: Optional[Path], info: ValidationInfo) -> str:
        if path and self._parent and isinstance(self._parent, MetaPath) and self._parent.path:
            return str(self.relative_to(self._parent))
        return str(path) if path else ""

    def _set_absolute_path(self) -> Path:
        if self.path and not self.path.is_absolute() and self._parent:
            self.path = (self._parent.path / self.path).resolve()
        return self.path

    @field_validator("path", mode="after")
    def set_absolute_path(cls, v: Path, info: ValidationInfo):
        parent = info.data.get("_parent")
        if parent and isinstance(parent, MetaPath) and parent.path:
            return (parent.path / v).resolve()
        return v

    def __str__(self):
        return f"MetaPath('{self.path}' ({'f' if self.is_file else 'd'}))"

    def __repr__(self):
        return str(self)


class MetaFile(MetaPath):
    """
    Metadata class for a file
    """

    _is_file: bool = True
    _is_dir: bool = False


class MetaDir(MetaPath):
    """
    Metadata class for a directory
    """

    files: Optional[list[MetaFile | type[MetaFile]]] = []
    directories: Optional[Union[list["MetaDir"], list[type["MetaDir"]]]] = []

    _is_file: bool = False
    _is_dir: bool = True

    def _populate_from_directory(self):
        self.files = []
        self.directories = []
        for item in self.path.iterdir():
            if item.is_file():
                self.files.append(MetaFile(path=item, _parent=self, parent_id=self.id))
            elif item.is_dir():
                dir_meta = MetaDir(path=item, _parent=self, parent_id=self.id)
                print(f"parent_id: {dir_meta.parent_id}, parent: {dir_meta._parent}")
                dir_meta._populate_from_directory()
                self.directories.append(dir_meta)

    def add_file(self, file: MetaFile):
        file.parent_id = self.id
        file._parent = self
        self.files.append(file)

    def add_dir(self, directory: "MetaDir"):
        directory.parent_id = self.id
        directory._parent = self
        self.directories.append(directory)

    def get_files(self, recursive: bool = True) -> Iterator[MetaFile]:
        """
        Get all files in the tree
        Args:
            recursive (bool): Whether to get files recursively
        """
        yield from self.files
        if recursive:
            for d in self.directories:
                yield from d.get_files(recursive=recursive)

    def get_dirs(self, recursive: bool = True) -> Iterator[Self]:
        """
        Get all directories in the tree
        Args:
            recursive (bool): Whether to get directories recursively
        """
        yield from self.directories
        if recursive:
            for d in self.directories:
                yield from d.get_dirs(recursive=recursive)

    def get_all(self, recursive: bool = True) -> Iterator["MetaPath"]:
        yield from self.get_dirs(recursive=recursive)
        yield from self.get_files(recursive=recursive)

    def get(
        self,
        name: str,
        default: Any = sentinel,
        recursive: bool = True,
        is_file: bool = True,
        is_dir: bool = True,
    ) -> "MetaPath":
        # Helper function to match the conditions
        def matches(meta: MetaPath, name: str) -> bool:

            if meta.path.name != name:
                try:
                    if str(meta.relative_to()) != name:
                        return False
                except:
                    return False
            if is_file and is_dir:
                return True
            if is_file and not meta.is_file:
                return False
            if is_dir and meta.is_file:
                return False
            return True

        # Search in the current level
        if self.files:
            for file in self.files:
                if matches(file, name):
                    return file

        if self.directories:
            for directory in self.directories:
                if matches(directory, name):
                    return directory

        # If recursive, search in subdirectories
        if recursive and self.directories:
            for directory in self.directories:
                result = directory.get(
                    name,
                    default=None,
                    recursive=recursive,
                    is_file=is_file,
                    is_dir=is_dir,
                )
                if result:
                    return result

        # If not found, return default
        if default is not sentinel:
            return default
        raise ValueError(f"File not found: {name}")

    def get_by_path(
        self,
        path: str | list,
        default: Any = sentinel,
        is_file: bool = True,
    ) -> "MetaPath":
        raise NotImplementedError("This method is not yet implemented")
        if isinstance(path, str):
            path = PurePath(path).parts
        g = self
        full_name = ""
        for p in path:
            full_name = os.path.join(full_name, p)
            g = g.get(full_name, is_file=is_file, is_dir=not is_file, default=None)
            if g is None:
                if default != sentinel:
                    return default
                raise ValueError(
                    f"Group {path} could not be found. Group {p} does not exist in {g}"
                )
        return g

    def get_dir(
        self,
        name: str,
        default: Any = sentinel,
        path: Optional[str| list] = None,
        recursive: bool = True,
        create: bool = False,
    ) -> "MetaDir":
        try:
            return self.get(name, default=default, recursive=recursive, is_file=False, is_dir=True)
        except ValueError:
            if create:
                new_dir = MetaDir(path=self.path / name, _parent=self, parent_id=self.id)
                self.directories.append(new_dir)
                return new_dir
            raise

    def get_file(
        self,
        name: str,
        default: Any = sentinel,
        path: Union[str, list] = None,
        recursive: bool = True,
        create: bool = False,
    ) -> "MetaFile":
        try:
            return self.get(name, default=default, recursive=recursive, is_file=True, is_dir=False)
        except ValueError:
            if create:
                new_file = MetaFile(path=self.path / name, _parent=self, parent_id=self.id)
                self.files.append(new_file)
                return new_file
            raise

    def pformat(self, level: int = 0, indent: int = 2) -> str:
        """Create the pretty printed representation of the class as a string"""
        indent_str = " " * indent
        indent_str = indent_str * level
        s = f"{indent_str}{self.path.name} ({'f' if self.is_file else 'd'})\n"
        for f in self.files:
            s += f"{indent_str}  {f.path.name} (f)\n"
        for d in self.directories:
            s += d.pformat(level=level + 1)
        return s

    def pprint(self, level: int = 0, indent: int = 2, file: TextIO = sys.stdout):
        """Pretty print the class"""
        print(self.pformat(level=level, indent=indent), file=file)


class Meta(MetaDir):
    """
    Metadata class for a directory. This is the root of the metadata tree
    """

    metas: Optional[list[MetaBase | type[MetaBase]]] = Field(
        default=[], description="Any additional metadata"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    _metafile_location: Optional[Path] = None

    def set_save_location(self, location: Path):
        self._metafile_location = location

    def add_meta(self, meta: MetaBase):
        self.metas.append(meta)

    @classmethod
    def create_from_directory(cls, directory: Path) -> "Meta":
        """
        Create a Meta instance from a directory. This will recursively populate the tree
        Args:
            directory (Path): The path to the directory
        Returns:
            Meta: The root of the metadata tree
        """
        if not directory.is_dir():
            raise ValueError("The specified path is not a directory")

        meta_root = cls(path=directory.resolve())
        meta_root._populate_from_directory()
        return meta_root

    def save(self, dest: str | Path = sentinel, overwrite: bool = False, indent: int = 2):
        """
        Save the metadata to a file
        Args:
            dest (Path): The path to save the metadata to
            overwrite (bool): Whether to overwrite the destination file if it exists
        """
        if dest == sentinel and self._metafile_location:
            dest = self._metafile_location
        elif dest == sentinel:
            dest = "metadata.json"
        dest = Path(dest)
        if dest.exists() and not overwrite:
            raise ValueError(f"Destination file already exists: {dest}")
        if not dest.parent.exists():
            dest.parent.mkdir(parents=True)
        
        ## Create a temporary file to write to
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            json.dump(self.model_dump(exclude_none=True, mode="json"), f, indent=indent)

            ## Now move the temporary file to the destination
            os.replace(f.name, dest)

    def _populate_references(self):
        """
        Resolve parent links for all MetaPath instances in the tree
        """
        mapping = {self.id: self}
        if self.metas:
            mapping.update({meta.id: meta for meta in self.metas})
        mapping.update({meta.id: meta for meta in self.get_all(recursive=True) if meta})

        for meta in mapping.values():
            ## Resolve Parents
            if meta.parent_id:
                meta._parent = mapping[meta.parent_id]
                meta._set_absolute_path()
                if not meta.path.exists():
                    raise ValueError(f"Path does not exist: {meta.path}")
            ## Resolve Origins
            if meta.origin_ids:
                meta._origins = [mapping[origin_id] for origin_id in meta.origin_ids]

    @classmethod
    def load(cls, path: Path, set_save_location: bool = False) -> "Meta":
        with path.open("r") as f:
            data = json.load(f)
        root: Self = cls.deserialize(data)
        ## Now resolve our references
        root._populate_references()
        if set_save_location:
            root._metafile_location = path
        return root

    @staticmethod
    def from_dir(
        directory: Union[str, Path],
        create: bool = False,
        name="metadata.json",
        set_save_location: bool = False,
    ) -> "Meta":
        """
        Load metadata from a directory
        Args:
            location (str | Path): The location to load the metadata from
            create (bool): Whether to create the metadata if it doesn't exist
        Returns:
            Meta: The metadata
        """
        if isinstance(directory, str):
            directory = Path(directory)
        location = directory / name
        if location.exists():
            m = Meta.load(location)
        elif create:
            if not location.parent.exists():
                location.parent.mkdir(parents=True)
            m = Meta(path=directory)
            m.save(location)
        else:
            raise ValueError(
                f"Metadata file does not exist: {location}. pass create=True to create it"
            )
        if set_save_location:
            m.set_save_location(location)
        return m

    def _populate_from_directory(self):
        """ """
        self.files: list[MetaFile] = []
        self.directories: list[MetaDir] = []
        for item in self.path.iterdir():
            if item.is_file():
                self.files.append(MetaFile(path=item, _parent=self, parent_id=self.id))
            elif item.is_dir():
                dir_meta = MetaDir(path=item, _parent=self, parent_id=self.id)
                dir_meta._populate_from_directory()
                self.directories.append(dir_meta)


class MetaString(MetaBase):
    """
    Metadata class for a string
    """

    value: str = Field(default="")


class MetaInt(MetaBase):
    """
    Metadata class for an integer
    """

    value: int = Field(default=0)


class MetaFloat(MetaBase):
    """
    Metadata class for a float
    """

    value: float = Field(default=0.0)


# Fix forward reference issues
MetaBase.model_rebuild()
MetaPath.model_rebuild()
Meta.model_rebuild()


# Run the test function
# Run the provided tests to verify the functionality
# def test_meta_path_get(tmp_path):
#     # Setup a sample directory structure
#     root = MetaPath(
#         path=Path("/"),
#         is_file=False,
#         files=[
#             MetaFile(path=Path("/file1.txt"), is_file=True),
#             MetaPath(path=Path("/file2.txt"), is_file=True),
#             MetaPath(path=Path("/dir7/dir9/file9.txt"), is_file=True),
#         ],
#         directories=[
#             MetaPath(
#                 path=Path("/dir1"),
#                 is_file=False,
#                 files=[MetaPath(path=Path("/dir1/file3.txt"), is_file=True)],
#                 directories=[],
#             ),
#             MetaPath(
#                 path=Path("/dir2"),
#                 is_file=False,
#                 files=[],
#                 directories=[
#                     MetaPath(
#                         path=Path("/dir2/dir3"),
#                         is_file=False,
#                         files=[MetaPath(path=Path("/dir2/dir3/file4.txt"), is_file=True)],
#                         directories=[],
#                     )
#                 ],
#             ),
#         ],
#     )

#     # Test cases
#     assert root.get("file1.txt").path == Path("/file1.txt")
#     assert root.get("file3.txt").path == Path("/dir1/file3.txt")
#     assert root.get("file4.txt").path == Path("/dir2/dir3/file4.txt")
#     assert root.get("file5.txt", default="Not Found") == "Not Found"
#     assert root.get("dir3", is_dir=True).path == Path("/dir2/dir3")
#     assert root.get("file2.txt", is_file=True).path == Path("/file2.txt")
#     assert root.get("file1.txt", is_file=True).path == Path("/file1.txt")
#     assert root.get("dir1", is_dir=True).path == Path("/dir1")

#     # Test non-recursive search
#     assert root.get("file3.txt", recursive=False, default="Not Found") == "Not Found"

#     # Test full path search
#     assert root.get_by_path("/dir1/file3.txt").path == Path("/dir1/file3.txt")
#     assert root.get_by_path("/dir2/dir3/file4.txt").path == Path("/dir2/dir3/file4.txt")
#     assert root.get_by_path("/dir2/dir4/file5.txt", default="Not Found") == "Not Found"
#     assert root.get_by_path("/dir7/dir9/file9.txt").path == Path("/dir7/dir9/file9.txt")

#     print("All tests passed!")


# Execute the test function
# test_meta_path_get(tmp_path=None)
if __name__ == "__main__":
    # p = MetaFile(path=Path("/dir1/file3.txt"))
    # d = MetaDir(
    #     path=Path("/dir1"),
    #     files=[p],
    #     directories=[],
    # )
    # d.files.append(p)
    # print(d)
    # print(d.get("file3.txt"))

    # # # test_meta_path_get()
    # pb = MetaBase()
    # mb = MetaBase(_parent=pb)
    # print(mb._parent)
    # o = MetaInt(value=1)

    # s = MetaString(value="Hello", metadata={"zotfoo": 1})
    # s.add_origin(o)
    root = Meta.create_from_directory(Path("src"))
    # root.add_meta(s)
    # root.add_meta(o)
    # # print(s)
    print("DUMP", root.model_dump())
    # g = root.get_dir("qai")
    # g.add_origin(s)
    root.save(Path("metadata.json"), overwrite=True)
    # print("ALL SOURCES", list(g.get_sources()))
    # print("Deepest", list(g.get_sources(SearchDepth.deepest)))
    # root.pprint()
    # loaded_root = Meta.load(Path("metadata.json"))
    # g = loaded_root.get_dir("qai")
    # print(g)
    # # # for f in g.get_all():
    # # #     print(f)

    # loaded_root.pprint()
