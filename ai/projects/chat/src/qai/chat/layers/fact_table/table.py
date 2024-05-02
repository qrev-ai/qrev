from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Self

from qai.chat.layers.layer import Layer
from qai.chat.layers.query import Query, QueryReturn

from copy import deepcopy

@dataclass
class FactTable(Layer):
    fact_table: dict[str, QueryReturn] = None
    company_name: str = ""

    def __post_init__(self):
        if not self.fact_table:
            raise ValueError("FactTable must be initialized with a fact_table")

    def _query(
        self,
        query: Query,
    ) -> QueryReturn:
        q = query.query
        output = self.fact_table.get(q, None)
        output = deepcopy(output)

        if self.exit_after_success and output:
            output.found_answer = True
        output.query = query
        return output
