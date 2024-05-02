from typing import Self

from llama_index.agent.openai import OpenAIAgent
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.memory.chat_memory_buffer import ChatMemoryBuffer
from llama_index.core.storage.chat_store import SimpleChatStore
from llama_index.llms.openai import OpenAI
from pi_conf import load_config
from pi_log import logs

from qai.agent.agents.find_agent import AgentType, FindAgentWorker
from qai.agent.sessions.qai_session import QaiSession

log = logs.getLogger(__name__, to_stdout=True, level=logs.DEBUG)
TOKEN_LIMIT = 3000


class QaiBot(OpenAIAgent):

    def __init__(
        self,
        # db_config: dict,
        # model_config: dict,
        # tools: List[BaseTool],
        llm: OpenAI = None,
        model_config: dict = None,
        db_config: dict = None,
        *args,
        **kwargs,
    ):
        self.llm = llm
        self.chat_store = SimpleChatStore()
        self.model_config = model_config
        self.db_config = db_config
        self.last_sessions: dict[str, QaiSession] = {}
        self.sessions: dict[str, QaiSession] = {}

    @classmethod
    def create(cls, db_config: dict, model_config: dict, *args, **kwargs) -> Self:
        llm = OpenAI(**model_config)
        qaibot = QaiBot(
            llm=llm,
            db_config=db_config,
            model_config=model_config,
            *args,
            **kwargs,
        )
        return qaibot

    def chat(
        self, query: str, user_id: str, session_id: str = None, token_limit: int = TOKEN_LIMIT
    ):
        chat_memory = ChatMemoryBuffer.from_defaults(
            token_limit=token_limit,
            chat_store=self.chat_store,
            chat_store_key=user_id,
        )
        from pprint import pprint

        pprint(chat_memory.get_all())

        agent = FindAgentWorker.create(chat_memory=chat_memory)
        agent_type = agent.chat(query)
        print(f"Agent type: {agent_type}")
        session = self._get_session(agent_type, session_id, user_id=user_id)
        if session is None:
            session = QaiSession(
                db_config=self.db_config,
                model_config=self.model_config,
                session_id=session_id,
                agent_type=agent_type,
                memory=chat_memory,
            )
            self.sessions[session.session_id] = session
        self.last_sessions[user_id] = session
        return session.chat(query)

    def _get_session(self, agent_info: AgentType, session_id: str, user_id: str) -> QaiSession:
        if session_id in self.sessions:
            return self.sessions[session_id]
        if self.last_sessions.get(user_id) is None:
            return None
        agent_type = agent_info
        last_session = self.last_sessions.get(user_id)
        if agent_type == last_session.agent_type:
            last_session
        return None


if __name__ == "__main__":
    cfg = load_config("qai-chat")
    cfg.to_env()
    agent = QaiBot.create(db_config=cfg.get("db_config"), model_config=cfg.model)
    sentence = "I want to create a campaign"
    print(agent.chat(sentence, user_id="1"))
    sentence = "With lots of toppings"
    print(agent.chat(sentence, user_id="1"))

    sentence = "and more"
    print(agent.chat(sentence, user_id="1"))

    print("FINISHED")
