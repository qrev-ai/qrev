## Test the llama_chroma module

import os
import unittest

from pi_log import get_app_logger

from qai.ai.frameworks.llama.llama_chroma import LlamaChroma

print(f" app logger name: {get_app_logger().name}")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


class TestLlamaChroma(unittest.TestCase):

    def test_get_or_create_collection_custom_embed(self):
        llama = LlamaChroma()
        embed_model = "BAAI/bge-small-en-v1.5"
        import_dir = os.path.join(DATA_DIR, "test_website")
        collection = llama.get_or_create_collection(
            "test_collection", import_dir, model_name=embed_model
        )
        self.assertTrue(collection)
        collection2 = llama.get_collection("test_collection")
        self.assertTrue(collection2)
        self.assertEqual(collection.name, collection2.name)

    def test_get_last_collection(self):
        llama = LlamaChroma()
        embed_model = "BAAI/bge-small-en-v1.5"
        import_dir = os.path.join(DATA_DIR, "test_website")
        collection = llama.create_or_update_collection(
            "test_collection2", import_dir, model_name=embed_model, use_timestr=True
        )
        self.assertIsNotNone(collection)
        collection2 = llama.create_or_update_collection(
            "test_collection2", import_dir, model_name=embed_model, use_timestr=True
        )
        last_collection = llama._get_last_collection(llama.client, "test_collection2")
        self.assertEqual(last_collection.name, collection2.name)

    def test_get_always(self):
        llama = LlamaChroma()
        embed_model = "BAAI/bge-small-en-v1.5"
        llama.client.create_collection
        

if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestLlamaChroma(testmethod))
        unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
