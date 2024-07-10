import uuid
from pprint import pformat

import chromadb

# from qai.chat import cfg as gcfg
from llama_index.agent.openai import OpenAIAgent, OpenAIAssistantAgent
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.chat_engine.types import AgentChatResponse
from llama_index.core.tools import QueryEngineTool, ToolMetadata
from llama_index.vector_stores.chroma import ChromaVectorStore
from pi_log import logs

from qai.ai.frameworks.llama.llama_chroma import LlamaChroma, LlamaChromaConfig
from qai.ai.frameworks.openai.llm import OpenAILLM
from qai.chat import VERSION
from qai.chat.db.chroma.chroma import Chroma

log = logs.getLogger(__name__)
thread_ids = {}


def _make_key(user_id: str, company_name: str = None):
    return f"{user_id}:{company_name}"


def company_query(
    query: str,
    user_id: str,
    company_name: str,
    company_id: str,
    model: str = None,
    guid: str = None,
    model_cfg: dict = None,
    chroma_cfg: dict = None,
) -> AgentChatResponse:

    collection_name = f"{company_name}_simplified_md"

    log.debug(
        f"company_name={company_name}, company_id={company_id} col_name={collection_name}",
        flush=True,
    )
    query = query.strip()

    guid = guid or uuid.uuid4().hex

    model = model or model_cfg.name

    conf = LlamaChromaConfig(host=chroma_cfg.host, port=chroma_cfg.port)
    c = LlamaChroma(config=conf)
    chroma_collection = c.get_last_collection(collection_name)

    chroma_client = chromadb.HttpClient(host=chroma_cfg.host, port=chroma_cfg.port)
    chroma_collection = Chroma._get_last_collection(chroma_client, collection_name)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    company_tool = QueryEngineTool(
        query_engine=index.as_query_engine(similarity_top_k=3),
        metadata=ToolMetadata(
            name=f"{company_name}_data",
            description=(
                f"Provides information from the {company_name} website. "
                f"Use a detailed plain text question as input to the tool."
            ),
        ),
    )
    key = _make_key(user_id, company_name)
    thread_id_tuple = thread_ids.get(key, None)
    log.debug(f"user_id={user_id} thread_id={thread_id_tuple}", flush=True)
    if thread_id_tuple is None:
        instructions = (
            f"You are a QA assistant designed to help users answer questions about the {company_name} website."
            f" Provide detailed information but try and be concise. "
            f"Do not make up information and use only the information provided. "
            f"If the user says you, yours, and your assume they are referring to {company_name}."
        )
        log.debug(f"From new thread id {thread_id_tuple}")
        agent = OpenAIAssistantAgent.from_new(
            name=f"{company_name} Website Assistant",
            instructions=instructions,
            tools=[company_tool],
            verbose=True,
            thread_id=None,
            model=model,
            run_retrieve_sleep_time=1.0,
        )
        thread_id_tuple = (agent.thread_id, agent._assistant.id)
        thread_ids[key] = thread_id_tuple
    else:
        log.debug(f"From existing thread id {thread_id_tuple}")
        agent = OpenAIAssistantAgent.from_existing(
            thread_id=thread_id_tuple[0],
            assistant_id=thread_id_tuple[1],
            tools=[company_tool],
            verbose=True,
            run_retrieve_sleep_time=1.0,
        )

    log.debug(f"<{query}>")
    response = agent.chat(query)
    log.debug(f"Response was ###\n{response}\n###", flush=True)

    return response
