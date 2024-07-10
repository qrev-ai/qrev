
from .chroma.chroma import Chroma


def get_retriever(retriever_type: str, **kwargs) -> Chroma :
    if retriever_type == "chroma":
        return Chroma(**kwargs)
    elif retriever_type == "llamaindex":
        # return LLamaRetriever(**kwargs)
        raise NotImplementedError("LLamaRetriever not implemented")
