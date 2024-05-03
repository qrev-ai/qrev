from typing import Dict, Union

import tiktoken

default_encoding_name = "cl100k_base"  # gpt-4, gpt-3.5-turbo, text-embedding-ada-002


def num_tokens(
    string_or_messages: str | list[dict[str, str]],
    encoding_name: str = default_encoding_name,
) -> int:
    if isinstance(string_or_messages, list):
        content = [m["content"] for m in string_or_messages]
        string_or_messages = "\n".join(content)
    if not isinstance(string_or_messages, str):
        raise ValueError(f"string_or_messages must be str or  dict, got {type(string_or_messages)}")
    encoding = tiktoken.get_encoding(encoding_name)
    num_tokens = len(encoding.encode(string_or_messages))
    return num_tokens
