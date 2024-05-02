from enum import StrEnum
from functools import partial
from typing import Dict

import pandas as pd
from qai.ai.utils.nltk_utils import normalize

from qai.chat.layers.fact_table.table import FactTable
from qai.chat.layers.query import QueryReturn


class TableType(StrEnum):
    NORMAL = "normal"
    NORMALIZED = "normalized"
    STEM = "stem"


def facts_from_csv_file(
    data_loc: str, company_name: str = "", questions_have_slashes: bool = True
) -> dict[str, QueryReturn]:
    """
    Reads a csv file and returns a dictionary of facts.
    """
    facts = {}
    df = pd.read_csv(data_loc)
    for row in df.iterrows():
        row = row[1]
        if questions_have_slashes:
            questions = row["question"].split("/")
        else:
            questions = [row["question"]]
        questions = [x.strip() for x in questions]

        company_name = row.get("company_name", company_name)
        for q in questions:
            qr = QueryReturn.from_values(
                query=q,
                response=row["answer"],
                sources=[row["url"]],
                category=row["category"],
                company_name=company_name,
            )
            facts[row["question"]] = qr

    return facts


def get_fact_table(fact_file: str, company_name: str = "", type: str = TableType.NORMAL):
    facts = facts_from_csv_file(fact_file, company_name)
    if type == TableType.NORMAL:
        norm = partial(
            normalize,
            to_lower=True,
            to_alphanumeric=True,
            use_word_map=False,
            remove_filler_words=False,
            contractions=False,
            stopwords=True,
            stem=False,
            lemma=False,
            tag_pos=False,
        )

        nfacts = {norm(k): v for k, v in facts.items()}
        return FactTable("FactTable:normal", fact_table=nfacts, preprocessing_functions=[norm])
    if type == TableType.NORMALIZED:
        norm = partial(
            normalize,
            to_lower=True,
            to_alphanumeric=True,
            use_word_map=True,
            remove_filler_words=True,
            contractions=True,
            stopwords=True,
            stem=False,
            lemma=True,
            tag_pos=True,
        )

        nfacts = {norm(k): v for k, v in facts.items()}
        return FactTable("FactTable:normalized", fact_table=nfacts, preprocessing_functions=[norm])
    if type == TableType.STEM:
        norm = partial(
            normalize,
            to_lower=True,
            to_alphanumeric=True,
            use_word_map=True,
            remove_filler_words=True,
            contractions=True,
            stopwords=True,
            stem=True,
            lemma=True,
            tag_pos=True,
        )

        nfacts = {norm(k): v for k, v in facts.items()}
        return FactTable("FactTable:stemmed", fact_table=nfacts, preprocessing_functions=[norm])
    raise ValueError(f"Unknown table type {type}")
