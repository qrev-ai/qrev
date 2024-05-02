import logging
import os
import re
import shutil
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from langchain_community.embeddings.huggingface import HuggingFaceEmbeddings
from llama_index import (
    Document,
    ServiceContext,
    SimpleDirectoryReader,
    StorageContext,
    VectorStoreIndex,
    get_response_synthesizer,
    load_index_from_storage,
)
from llama_index.embeddings import HuggingFaceEmbedding, LangchainEmbedding
# from llama_index.indices.postprocessor import (
#     AutoPrevNextNodePostprocessor,
#     KeywordNodePostprocessor,
# )
# from llama_index.postprocessor import SimilarityPostprocessor
# from llama_index.query_engine import RetrieverQueryEngine
# from llama_index.readers.file.markdown_reader import MarkdownReader
# from llama_index.response_synthesizers import (
#     BaseSynthesizer,
#     ResponseMode,
#     get_response_synthesizer,
# )
# from llama_index.retrievers import (
#     BaseRetriever,
#     VectorIndexAutoRetriever,
#     VectorIndexRetriever,
# )
# from llama_index.schema import MetadataMode
# from llama_index.storage.storage_context import StorageContext
# from llama_index.vector_stores import ChromaVectorStore
# from llama_index.vector_stores.types import MetadataInfo, VectorStoreInfo

from qai.storage.retriever import Retriever
# from qai.core import Meta, MetaObj

# from qscraper.filters.filter import Filter
# from qscraper.processors.text_writer import TextWriter

# from qai.chat import cfg
# from qai.chat.db import Retriever
# from qai.chat.db.chroma.chroma import Chroma, ChromaConfig
# from qai.chat.layers.llm.chatbot import LLM
# from qai.chat.prompt.config import CONTEXT_TOKEN_LIMIT, HISTORY_TOKEN_LIMIT

# from qai.scraper.scrapers.scraper import WebObj

if TYPE_CHECKING:
    from chromadb import Collection

def title_format(s: str):
    ### remove everything before _com
    title = re.sub(r"^.+?_com", "", s)

    title = title.replace("_", " ")
    title = title.replace("-", " ")
    title = title.replace(".html", "")
    title = title.replace(".md", "")
    ## remove multiple spaces
    title = re.sub(r"\s+", " ", title)
    title = title.strip()
    return title


@dataclass
class LlamaAdapter(Retriever):
    index: VectorStoreIndex = None
    db_location: str = None
    index_name: str = None  ## f"{company_name}_{some_id}"
    # chroma: Chroma = None
    init_chroma: bool = True

    def __post_init__(self):
        # if "chroma_config" in self.config:
        #     self.chroma = Chroma(config=self.config["chroma_config"])
        print("Initialized LLamaIndex. self.chroma=", self.chroma)
        if self.index_name is None:
            raise Exception("index_name must be set")
        if self.init_chroma:
            chroma_collection = self.chroma.get_collection(self.index_name)
            vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

            self.index = VectorStoreIndex.from_vector_store(
                vector_store=vector_store,
            )

    def get_context(
        self,
        query: str,
        k: int = 8,
    ) -> list[tuple[str, dict[str, Any]]]:
        """
        Given a query, return the context of the query.
        The context is a list of tuples (text, metadata) where text is the text of the document
        """
        nodes = self.query(query=query, k=k)
        return [(n.get_text(), n.node.source_node.metadata) for n in nodes]

    def get_index(self):
        chroma_collection = self.chroma.get_collection(self.index_name)
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

        self.index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
        )

    def query(self, query: str, k=8, verbose=False, **kwargs):
        print("####################")
        if self.index is None:
            raise Exception("Index is not set")
            # self.index_name = f"{gcompany}_simplified_md"
            # self.index = self.get_or_create_index(
            #     meta=gmeta,
            #     subfolder="simplified_md",
            #     needs_meta=False,
            # )
        retriever = VectorIndexRetriever(
            self.index,
            similarity_top_k=k,
        )

        node_postprocessors = [
            KeywordNodePostprocessor(
                # required_keywords=["Combinator"],
                # exclude_keywords=["Italy"],
            )
        ]
        query_engine = RetrieverQueryEngine.from_args(
            retriever,
            node_postprocessors=node_postprocessors,
            response_mode=ResponseMode.TREE_SUMMARIZE,
        )
        nodes = query_engine.retrieve(query)
        return_nodes = []
        text_hash = set()
        length = 0
        for n in nodes:
            # print(n.node.source_node, n)
            if verbose:
                print(
                    f" {query} fn ############### {n.score:.3f}",
                    n.node.source_node.metadata,
                    len(n.get_content().strip()),
                    " cur len=",
                    length,
                )
            txt = n.get_text()
            if txt in text_hash:
                continue
            text_hash.add(txt)
            length += len(txt)
            return_nodes.append(n)
        return return_nodes

    def _make_category(
        self, meta: Meta, wf: MetaObj, title: str, str_cat: str, categories: list[str]
    ):
        return "Unknown"
        category = meta.get(wf.url, {}).get("category")
        if not category or category == "Unknown" or category == "None":
            if len(categories) <= 1:
                return categories[0]
            user_msg = (
                f"Given the following markdown in triple quotes, "
                f"give the single best category among [{str_cat}] "
                "that it belongs to?\n\n"
            )
            with open(wf.full_path, "r") as f:
                t = f.read()
                user_msg += f'"""{t}"""'
            try:
                llm = LLM(config=cfg.category_model)
                print(f"Using llm to get category for {wf.url}")
                qr = llm.simple_query(user_msg)

                category = qr
                ## if quotes appear then get the category out of the quotations
                if '"' in category:
                    category = category.split('"')[1]
            except Exception as e:
                print(e)
                category = title.split(" ")[0]
            meta.save()
        return category

    def _get_or_create_index(
        self,
        meta: Meta,
        # website_dir: str,
        subfolder: str = None,
        overwrite: bool = False,
        categories: list[str] = None,
        needs_meta: bool = True,
    ) -> "LlamaAdapter":
        db_location = self.db_location
        col = self.chroma.get_or_create_collection(self.index_name)
        if col.count() > 0:
            chroma_collection = self.chroma.get_or_create_collection(self.index_name)
            vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            self.index = VectorStoreIndex.from_vector_store(
                vector_store=vector_store,
            )
            return self
        print(
            f"Creating index at {db_location} from {meta.get_directory()} with subfolder {subfolder}"
        )
        if not categories:
            categories = ["Unknown"]
        str_cat = ", ".join(categories)

        storage_context = None

        if db_location:
            db_location = os.path.expanduser(db_location)
            if overwrite and os.path.exists(db_location):
                shutil.rmtree(db_location)
            os.makedirs(db_location, exist_ok=True)

        elif os.path.exists(f"{db_location}/docstore.json"):
            print(f"Loading index from {db_location}")
            # rebuild storage context
            storage_context = StorageContext.from_defaults(persist_dir=db_location)
            # # load index
            # index = load_index_from_storage(storage_context)
            logging.info(f"Loaded index from {db_location}")
            return LlamaAdapter(index=index)
        elif self.chroma is not None:
            print(f"Creating index with chroma. {self.chroma.chroma_client} ")
            chroma_collection = self.chroma.get_or_create_collection(self.index_name)
            vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            # self.index = VectorStoreIndex.from_vector_store(
            #     vector_store=vector_store,
            # )

        documents = []
        meta_link = {}

        def meta_fn(filename):
            if filename in meta_link:
                return meta_link[filename]
            return {}

        ## Process files
        for wf in meta.get_files_meta(subfolder=subfolder, cls=MetaObj):
            print(f"subfolders={subfolder} WF {wf}")
            title = title_format(wf.uri.split("/")[-1])
            if not title:
                title = "Home Page"
            try:
                category = str(wf.category)

                if wf.category == "Unknown":
                    self._make_category(meta, wf, title, str_cat, categories)
            except Exception as e:
                category = self._make_category(meta, wf, title, str_cat, categories)

            wf_meta = {
                "url": wf.uri,
                "title": title,
                "category": category.lower(),
            }
            meta_link[str(wf.uri)] = wf_meta

            # print("     ", wf_meta, wf.full_path)
            ### TODO add metadata to the document
            # meta.meta[wf.url] = wf_meta
        d = meta.get_directory(subfolder=subfolder)
        documents = SimpleDirectoryReader(d, file_metadata=meta_fn, filename_as_id=True).load_data()

        meta.save()
        index = VectorStoreIndex.from_documents(
            documents=documents,
            storage_context=storage_context,
        )
        if self.chroma is None:
            index.storage_context.persist(persist_dir=db_location)

        self.index = index
        return self
