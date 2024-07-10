import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import pytest
from pydantic import Field

from qai.core.meta import (
    FileType,
    Meta,
    MetaBase,
    MetaFloat,
    MetaInt,
    MetaPath,
    MetaString,
    SearchDepth,
    MetaFile,
    MetaDir
)


class MetaDerived(MetaBase):
    """
    Derived metadata class
    """

    extra_field: str = Field(default="")



@pytest.fixture
def sample_meta_dir():
    return MetaDir(
        path=Path("/"),
        files=[
            MetaFile(path=Path("/file1.txt")),
            MetaFile(path=Path("/file2.txt")),
            MetaFile(path=Path("/dir7/dir9/file9.txt")),
        ],
        directories=[
            MetaDir(
                path=Path("/dir1"),
                files=[MetaFile(path=Path("/dir1/file3.txt"))],
                directories=[],
            ),
            MetaDir(
                path=Path("/dir2"),
                files=[],
                directories=[
                    MetaDir(
                        path=Path("/dir2/dir3"),
                        files=[MetaFile(path=Path("/dir2/dir3/file4.txt"))],
                        directories=[],
                    )
                ],
            ),
        ],
    )

def test_meta_base_initialization():
    meta = MetaBase(metadata={"key": "value"})
    assert isinstance(meta.id, UUID)
    assert meta.metadata == {"key": "value"}
    assert meta.parent_id is None
    assert meta.origin_ids is None


def test_meta_base_serialization():
    meta = MetaBase(class_name="TestClass")
    serialized = meta.model_dump()
    assert isinstance(serialized["id"], str)
    assert "class_name" in serialized


def test_meta_base_add_origin():
    parent = MetaBase(class_name="Parent")
    child = MetaBase(class_name="Child")
    parent.add_origin(child)
    assert child.id in parent.origin_ids
    assert child in parent._origins


def test_meta_base_get_sources():
    parent = MetaBase(class_name="Parent")
    child1 = MetaBase(class_name="Child1")
    child2 = MetaBase(class_name="Child2")
    parent.add_origin(child1)
    parent.add_origin(child2)
    sources = list(parent.get_sources(SearchDepth.all))
    assert len(sources) == 2
    assert child1 in sources
    assert child2 in sources


def test_meta_path_initialization():
    path = Path("/some/path")
    meta_path = MetaDir(path=path)
    assert meta_path.path == path
    assert not meta_path.is_file


def test_meta_path_populate_from_directory(tmp_path):
    dir_path = tmp_path / "test_dir"
    dir_path.mkdir()
    file_path = dir_path / "test_file.txt"
    file_path.write_text("content")

    meta = MetaDir(path=dir_path)
    meta._populate_from_directory()

    assert len(meta.files) == 1
    assert len(meta.directories) == 0
    assert meta.files[0].path == file_path


def test_meta_creation_from_directory(tmp_path):
    dir_path = tmp_path / "test_dir"
    dir_path.mkdir()
    file_path = dir_path / "test_file.txt"
    file_path.write_text("content")

    meta = Meta.create_from_directory(dir_path)

    assert meta.path == dir_path
    assert len(meta.files) == 1
    assert meta.files[0].path == file_path


def test_meta_save_load(tmp_path):
    dir_path = tmp_path / "test_dir"
    dir_path.mkdir()
    file_path = dir_path / "test_file.txt"
    file_path.write_text("content")

    meta = Meta.create_from_directory(dir_path)
    dest = tmp_path / ".metadata.json"
    meta.save(dest)

    loaded_meta = Meta.load(dest)
    assert loaded_meta.path == meta.path
    assert loaded_meta.files[0].path == meta.files[0].path


def test_meta_string_initialization():
    meta_string = MetaString(value="test")
    assert meta_string.value == "test"


def test_meta_int_initialization():
    meta_int = MetaInt(value=42)
    assert meta_int.value == 42


def test_meta_float_initialization():
    meta_float = MetaFloat(value=3.14)
    assert meta_float.value == 3.14


def test_meta_derived_save_load(tmp_path):

    # Create an instance of MetaDerived
    meta_derived = MetaDerived(extra_field="extra_value")

    # Define the file path to save the metadata
    dest = tmp_path / "meta_derived.json"

    # Save the instance
    with dest.open("w") as f:
        json.dump(meta_derived.model_dump(exclude_none=True, mode="json"), f, indent=2)

    # Load the instance
    with dest.open("r") as f:
        data = json.load(f)
        loaded_meta = MetaDerived.deserialize(data)

    # Ensure the loaded instance matches the original
    assert loaded_meta.class_name == meta_derived.class_name
    assert loaded_meta.extra_field == meta_derived.extra_field
    assert loaded_meta.id == meta_derived.id

def test_from_dir_create_true(tmp_path):
    dir_path = tmp_path / "test_dir"

    meta = Meta.from_dir(dir_path, create=True)
    assert meta.path == dir_path


def test_get_file_by_name(sample_meta_dir):
    assert sample_meta_dir.get("file1.txt").path == Path("/file1.txt")
    assert sample_meta_dir.get("file3.txt").path == Path("/dir1/file3.txt")
    assert sample_meta_dir.get("file4.txt").path == Path("/dir2/dir3/file4.txt")

def test_get_file_with_default(sample_meta_dir):
    assert sample_meta_dir.get("file5.txt", default="Not Found") == "Not Found"

def test_get_directory_by_name(sample_meta_dir):
    assert sample_meta_dir.get("dir3", is_dir=True).path == Path("/dir2/dir3")
    assert sample_meta_dir.get("dir1", is_dir=True).path == Path("/dir1")

def test_get_file_with_is_file_flag(sample_meta_dir):
    assert sample_meta_dir.get("file2.txt", is_file=True).path == Path("/file2.txt")
    assert sample_meta_dir.get("file1.txt", is_file=True).path == Path("/file1.txt")

def test_non_recursive_search(sample_meta_dir):
    assert sample_meta_dir.get("file3.txt", recursive=False, default="Not Found") == "Not Found"

# def test_get_by_full_path(sample_meta_dir):
#     assert sample_meta_dir.get_by_path("/dir1/file3.txt").path == Path("/dir1/file3.txt")
#     assert sample_meta_dir.get_by_path("/dir2/dir3/file4.txt").path == Path("/dir2/dir3/file4.txt")
#     assert sample_meta_dir.get_by_path("/dir2/dir4/file5.txt", default="Not Found") == "Not Found"
#     assert sample_meta_dir.get_by_path("/dir7/dir9/file9.txt").path == Path("/dir7/dir9/file9.txt")

if __name__ == "__main__":
    pytest.main()
