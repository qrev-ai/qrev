import logging
from abc import abstractmethod
from dataclasses import dataclass
from typing import Any, Callable, Union

from qai.chat.layers.query import Query, QueryReturn


@dataclass
class Layer:
    name: str = ""
    preprocessing_functions: list[Callable[[str], str]] = None
    postprocessing_functions: list[Callable[[QueryReturn], QueryReturn]] = None
    exit_after_success: bool = True

    def pre_process(self, input: Query) -> Query:
        if self.preprocessing_functions:
            for func in self.preprocessing_functions:
                logging.debug(f"{input.guid}:Layer::pre_process: layer={self.name}, input={input} ->")
                input = func(input)
                logging.debug(f"{input.guid}:Layer::pre_process: layer={self.name}, new_input={input} <-")
        return input

    def post_process(self, output: QueryReturn) -> QueryReturn:
        if self.postprocessing_functions:
            for func in self.postprocessing_functions:
                output = func(output)
        return output

    def query(
        self,
        query: Union[str, Query],
        query_params: dict[str, Any] = None,
        **kwargs,
    ) -> QueryReturn:
        if isinstance(query, str):
            query = Query(query, params=query_params)
        newquery = self.pre_process(query)
        result = self._query(
            newquery,
            **kwargs,
        )
        result = self.post_process(result)
        return result

    @abstractmethod
    def _query(
        self,
        query: Query,
        **kwargs,
    ) -> QueryReturn:
        ...