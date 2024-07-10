prompt_string = """Answer the question at the end using the following extracted content of a long document.
Keep your answers concise, one sentence or less.
If you don't know the answer, just write the number -1, don't try to make up an answer.

CONTENT:{context}
Q: {question}
A:"""

history_prompt_string = """Answer the question at the end using the following extracted content of a long document and a previous question answering session.
Keep your answers concise, one sentence or less.
If you don't know the answer, just write the number -1, don't try to make up an answer.
CONTENT:{context}
CHAT_HISTORY: {history}
Q: {question}
A:"""
