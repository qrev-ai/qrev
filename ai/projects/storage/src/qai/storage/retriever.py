from dataclasses import dataclass, field
from typing import Any


@dataclass
class Collection:
    def query(self, query: str, **kwargs) -> Any: ...


@dataclass
class Retriever:
    config: dict[str, Any] = field(default_factory=dict)

    def get_collection(self, collection_name: str) -> Collection: ...
