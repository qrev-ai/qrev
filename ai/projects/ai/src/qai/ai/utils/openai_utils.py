from enum import StrEnum

from termcolor import colored


class MessageRole(StrEnum):
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"
    USER = "user"


def to_message(content: str, role: MessageRole | str) -> dict[str, str]:
    """
    Create a message for the OpenAI chat API.
    args:
        content: str: The message content.
        role: MessageRole | str: The role of the message.
    returns:
        dict[str, str]: The message dictionary.
    """
    return {"role": str(role), "content": content}


def pretty_print_conversation(messages):
    role_to_color = {
        "system": "red",
        "user": "green",
        "assistant": "blue",
        "tool": "magenta",
    }

    for message in messages:
        if message["role"] == "system":
            print(colored(f"system: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "user":
            print(colored(f"user: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "assistant" and message.get("function_call"):
            print(
                colored(f"assistant: {message['function_call']}\n", role_to_color[message["role"]])
            )
        elif message["role"] == "assistant" and not message.get("function_call"):
            print(colored(f"assistant: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "tool":
            print(
                colored(
                    f"function ({message['name']}): {message['content']}\n",
                    role_to_color[message["role"]],
                )
            )

