import glob
import os
from enum import Enum

from chromadb.api.models.Collection import Collection
from flask import current_app as app
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, UnstructuredHTMLLoader
from langchain_community.embeddings import (
    HuggingFaceEmbeddings,
    LlamaCppEmbeddings,
    OpenAIEmbeddings,
)
from langchain_community.vectorstores import Chroma as LangChainChroma

from .chroma import Chroma, ChromaConfig

cfg = app.cfg

if cfg["huggingface"] and cfg["huggingface"]["api_token"]:
    os.environ["HUGGINGFACEHUB_API_TOKEN"] = cfg.huggingface.api_token


class ChromaUploader(Chroma):
    def make_collection(
        self,
        collection_name: str,
        document_location: str,
    ) -> Collection:
        print("Making new Chroma http client", "collection_name=", collection_name)
        embedding = HuggingFaceEmbeddings(model_name=cfg.embedding.name)
        documents = []
        print(f"Making Chroma index from document_location '{document_location}'")
        nfiles = 0
        for f in glob.glob(f"{document_location}/*.txt"):
            print("Loading", f)
            documents.append(TextLoader(f).load()[0])
            nfiles += 1
        for f in glob.glob(f"{document_location}/*.html"):
            print("Loading", f)
            documents.append(UnstructuredHTMLLoader(f).load()[0])
            nfiles += 1
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
        texts = text_splitter.split_documents(documents)
        print(f"Making Chroma index from nfiles={nfiles} num_texts '{len(texts)}'")
        # db.persist()

        db = LangChainChroma.from_documents(
            client=self.chroma_client,
            collection_name=collection_name,
            documents=texts,
            embedding=embedding,
            # client_settings={"anonymized_telemetry": False},
        )

        print(
            f"Finished making Chroma {collection_name} index: count={db._collection.count()}, Stored at",
        )
        return db._collection
