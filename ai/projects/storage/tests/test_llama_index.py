import os
import unittest
from urllib import request

from llama_index.core.indices.vector_store.retrievers import VectorIndexRetriever

from qai.storage import cfg

data_dir = os.path.join(os.path.dirname(__file__), "data", "paul_graham")


class TestClass(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        if not os.path.exists(os.path.join(data_dir, "paul_graham_essay.txt")):
            os.makedirs(data_dir, exist_ok=True)
            request.urlretrieve(
                "https://www.dropbox.com/s/f6bmb19xdg0xedm/paul_graham_essay.txt?dl=1",
                os.path.join(data_dir, "paul_graham_essay.txt"),
            )

    def tearDown(self) -> None:
        return super().tearDown()

    def test_index(self):
        from qai.storage.llama.llama_chroma import LLamaChroma, LLamaChromaConfig

        config = LLamaChromaConfig()
        retriever = LLamaChroma(config=config, llm_config=cfg.model)
        retriever.create(data_dir)

        response = retriever.search("Who is Paul Graham?")
        print(type(response))
        # from pprint import pprint

        # pprint(response)
        # for res in response:
        #     print(res)
        self.assertEqual(
            str(response),
            "Paul Graham is an American computer scientist, entrepreneur, and writer. He is best known as the co-founder of the startup accelerator Y Combinator. Graham has also written several influential essays on topics such as startups, programming, and technology. His essays are widely read and have gained a significant following in the tech community.",
        )


if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestClass(testmethod))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
