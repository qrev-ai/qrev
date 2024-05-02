from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class Role(StrEnum):
    system = "system"
    user = "user"
    assistant = "assistant"


class Message(dict):
    role: Role = None
    content: str = None
    timestamp: str = None

    @staticmethod
    def from_values(role: Role, content: str, timestamp: str = None):
        if timestamp is None:
            timestamp = datetime.utcnow().isoformat()
        return Message(role=role, content=content, timestamp=timestamp)
