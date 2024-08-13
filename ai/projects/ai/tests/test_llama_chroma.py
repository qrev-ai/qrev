import os
import pytest

from pi_log import get_app_logger
from qai.ai.frameworks.llama.llama_chroma import LlamaChroma

print(f" app logger name: {get_app_logger().name}")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def test_get_or_create_collection_custom_embed():
    llama = LlamaChroma()

    embed_model = "BAAI/bge-small-en-v1.5"
    import_dir = os.path.join(DATA_DIR, "test_website")
    collection = llama.get_or_create_collection(
        "test_collection", import_dir, model_name=embed_model
    )
    assert collection is not None
    collection2 = llama.get_collection("test_collection")
    assert collection2 is not None
    assert collection.name == collection2.name

def test_get_last_collection():
    llama = LlamaChroma()

    embed_model = "BAAI/bge-small-en-v1.5"
    import_dir = os.path.join(DATA_DIR, "test_website")
    collection = llama.create_or_update_collection(
        "test_collection2", import_dir, model_name=embed_model, use_timestr=True
    )
    assert collection is not None
    collection2 = llama.create_or_update_collection(
        "test_collection2", import_dir, model_name=embed_model, use_timestr=True
    )
    last_collection = llama._get_last_collection(llama.client, "test_collection2")
    assert last_collection.name == collection2.name

if __name__ == "__main__":
    pytest.main([__file__,"-W", "ignore:Module already imported:pytest.PytestWarning"])