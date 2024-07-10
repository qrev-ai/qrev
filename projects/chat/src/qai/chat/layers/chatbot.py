import logging
from dataclasses import dataclass, field
from typing import Any, Union

from qai.chat.layers.layer import Layer
from qai.chat.layers.query import Query, QueryReturn


@dataclass
class LayerBot:
    layers: list[Layer] = field(default_factory=list)
    config: dict[str, Any] = None

    def query(
        self,
        query: Union[str, Query],
        query_params=None,
    ) -> QueryReturn:
        if isinstance(query, str):
            query = Query(query, params=query_params)
        result = QueryReturn(query)
        for layer in self.layers:
            potential_result = layer._query(query)
            if not potential_result:
                continue
            logging.debug(
                f"{query.guid}:Chatbot.query: layer={layer.name}, query={query}, result={result}, found_answer={potential_result.found_answer}"
            )
            if potential_result.found_answer:
                return potential_result
        return result

    @property
    def version(self) -> str:
        import pkg_resources

        return pkg_resources.get_distribution("chatbot").version

    @property
    def system_message(self) -> str:
        for layer in self.layers:
            try:
                return layer.prompt_maker.system_message
            except Exception:
                pass
        return None
