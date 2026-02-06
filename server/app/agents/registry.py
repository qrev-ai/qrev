"""Agent Registry — all available agents and their metadata."""

from .types import Agent


class AgentRegistry:
    """Registry of all available QREV agents."""

    def __init__(self) -> None:
        self._agents: dict[str, Agent] = {}

    def register(self, agent: Agent) -> None:
        self._agents[agent.id] = agent

    def get(self, agent_id: str) -> Agent | None:
        return self._agents.get(agent_id)

    @property
    def agents(self) -> dict[str, Agent]:
        return dict(self._agents)

    def list_agents(self) -> list[dict]:
        return [
            {
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "model_tier": a.model_tier.value,
                "tools": [t.name for t in a.tools],
            }
            for a in self._agents.values()
        ]


# Singleton — agents register themselves on import
agent_registry = AgentRegistry()
