import json
import os
import tempfile
import tomllib
from pathlib import Path
from typing import List

import pytest
from pydantic import BaseModel

from qai.schema import DataFile, DataFolder, DataSource, DataText, DataURL, SourceType


@pytest.fixture
def test_config():
    # Create a temporary TOML file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml", delete=False) as f:
        f.write(
            """
[folder_source]
type = "folder"
source = "local_filesystem"
path = "/path/to/data"
recursive = true
file_pattern = "*.txt"
description = "Test folder source"

[file_source]
type = "file"
source = "local_file"
path = "/path/to/specific/file.txt"
encoding = "utf-8"
description = "Test file source"

[text_source]
type = "text"
source = "direct_input"
content = "This is a test content"
description = "Test text source"

[url_source]
type = "url"
source = "web"
url = "https://example.com/data"
headers = { Authorization = "Bearer token123" }
description = "Test URL source"
"""
        )
        config_path = f.name

    yield config_path
    os.unlink(config_path)


def test_data_folder_from_config(test_config):
    with open(test_config, "rb") as f:
        config = tomllib.load(f)

    folder_source = DataFolder.model_validate(config["folder_source"])

    assert folder_source.type == SourceType.FOLDER
    assert folder_source.source == "local_filesystem"
    assert folder_source.path == "/path/to/data"
    assert folder_source.recursive is True
    assert folder_source.file_pattern == "*.txt"
    assert folder_source.description == "Test folder source"


def test_data_file_from_config(test_config):
    with open(test_config, "rb") as f:
        config = tomllib.load(f)

    file_source = DataFile.model_validate(config["file_source"])

    assert file_source.type == SourceType.FILE
    assert file_source.source == "local_file"
    assert file_source.path == "/path/to/specific/file.txt"
    assert file_source.encoding == "utf-8"
    assert file_source.description == "Test file source"

    js = file_source.model_dump(mode="json")
    assert js["encoding"] == file_source.encoding
    assert js["path"] == file_source.path


def test_data_file_from_config_generic(test_config):
    with open(test_config, "rb") as f:
        config = tomllib.load(f)

    file_source = DataSource.model_validate(config["file_source"])

    assert isinstance(file_source, DataFile)
    assert file_source.type == SourceType.FILE
    assert file_source.source == "local_file"
    assert file_source.path == "/path/to/specific/file.txt"
    assert file_source.encoding == "utf-8"
    assert file_source.description == "Test file source"

    js = file_source.model_dump(mode="json")
    assert js["encoding"] == file_source.encoding
    assert js["path"] == file_source.path


def test_data_text_from_config(test_config):
    with open(test_config, "rb") as f:
        config = tomllib.load(f)

    text_source = DataText.model_validate(config["text_source"])
    assert text_source.content is not None
    assert text_source.type == SourceType.TEXT
    assert text_source.source == "direct_input"
    assert text_source.content == "This is a test content"
    assert text_source.description == "Test text source"

    js = text_source.model_dump(mode="json")
    assert js["content"] == text_source.content


def test_data_url_from_config(test_config):
    with open(test_config, "rb") as f:
        config = tomllib.load(f)

    url_source = DataURL.model_validate(config["url_source"])

    assert url_source.type == SourceType.URL
    assert url_source.source == "web"
    assert url_source.url == "https://example.com/data"
    assert url_source.headers == {"Authorization": "Bearer token123"}
    assert url_source.description == "Test URL source"


def test_invalid_source_type(test_config):
    invalid_config = {"type": "invalid_type", "source": "test"}

    with pytest.raises(ValueError):
        DataSource.model_validate(invalid_config)


def test_optional_fields():
    minimal_config = {"type": "folder", "source": "local", "path": "/path/to/folder"}

    folder_source = DataFolder.model_validate(minimal_config)
    assert folder_source.description is None
    assert folder_source.file_pattern is None
    assert folder_source.recursive is False


def test_load_all_sources_from_direct_types(test_config):
    with open(test_config, "rb") as f:
        config = tomllib.load(f)

    # Map config sections to their corresponding model classes
    model_map = {
        "folder_source": DataFolder,
        "file_source": DataFile,
        "text_source": DataText,
        "url_source": DataURL,
    }

    # Load all sources using model_validate
    sources = {
        key: model_class.model_validate(config[key]) for key, model_class in model_map.items()
    }

    # Verify all sources loaded correctly
    assert all(isinstance(source, DataSource) for source in sources.values())
    assert all(source.source is not None for source in sources.values())


def test_load_all_sources_from_data_sources(test_config):
    with open(test_config, "rb") as f:
        config = tomllib.load(f)

    # Load all sources using the factory method
    sources = {key: DataSource.model_validate(value) for key, value in config.items()}

    # Verify all sources loaded correctly and are of the correct type
    assert isinstance(sources["folder_source"], DataFolder)
    assert isinstance(sources["file_source"], DataFile)
    assert isinstance(sources["text_source"], DataText)
    assert isinstance(sources["url_source"], DataURL)

    # Verify source fields are correct
    assert sources["folder_source"].source == "local_filesystem"
    assert sources["file_source"].source == "local_file"
    assert sources["text_source"].source == "direct_input"
    assert sources["url_source"].source == "web"


class TestContainer(BaseModel):
    """Test container class that has a list of DataSource objects"""

    sources: List[DataSource]


def test_model_dump_with_datasource_list():
    """Test model_dump functionality with a list of DataSource objects"""
    # Create a test DataFile
    data_file = DataFile(
        type=SourceType.FILE, path="/path/to/test.txt", encoding="utf-8", description="Test file"
    )

    # Create the container with the DataFile
    container = TestContainer(sources=[data_file])

    # Dump the model to dict
    dumped = container.model_dump()

    # Assertions to verify the structure
    assert isinstance(dumped, dict)
    assert "sources" in dumped
    assert isinstance(dumped["sources"], list)
    assert len(dumped["sources"]) == 1

    # Verify the dumped DataFile structure
    dumped_file = dumped["sources"][0]
    assert dumped_file["type"] == "file"
    assert dumped_file["path"] == "/path/to/test.txt"
    assert dumped_file["encoding"] == "utf-8"
    assert dumped_file["description"] == "Test file"


def test_direct_datafile_serialization():
    """Test direct DataFile serialization"""
    data_file = DataFile(
        type=SourceType.FILE, path="/path/to/test.txt", encoding="utf-8", description="Test file"
    )

    dumped = data_file.model_dump()
    print("\nDirect DataFile serialization:")
    print(dumped)

    assert dumped["path"] == "/path/to/test.txt"
    assert dumped["type"] == "file"
    assert dumped["encoding"] == "utf-8"


if __name__ == "__main__":
    pytest.main([__file__])
