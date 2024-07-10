import unittest
from dataclasses import dataclass
from typing import Dict, List

import pandas as pd

from qai.chat import DATA_DIR, ROOT_DIR
from qai.chat.layers.query import Query, QueryReturn
from qai.chat.layers.fact_table.factory import (
    get_fact_table,
    facts_from_csv_file,
    TableType,
)
from qai.chat.layers.fact_table.table import FactTable
from qai.chat.utils.nltk_utils import normalize
from qai.chat.layers.chatbot import LayerBot

# def_file= f"{DATA_DIR}/companies/scrut/Scrut_IO_eb6a3f361c1e40febcddc49ae136e770_all_v1.csv"
def_file = f"{ROOT_DIR}/../tests/data/data_fact_table.csv"


def load_facts(
    fact_file: str = def_file, company_name: str = ""
) -> dict[str, QueryReturn]:
    return facts_from_csv_file(fact_file, company_name)


# class TestMultiLayerChatbot(unittest.TestCase):
#     def test_fact_table_preprocessing(self):
#         facts = load_facts()
#         real_answer = facts.get("what is earth?").response
#         cb = LayerBot()
#         table = get_fact_table(def_file, type=TableType.NORMAL)
#         cb.layers.append(table)
#         f = cb.query("WHat is earth?")
#         self.assertEqual(f.response, real_answer)
#         f = cb.query("earthing?")
#         self.assertEqual(f.response, f.not_found)

#         table = get_fact_table(def_file, type=TableType.NORMALIZED)
#         table.name = "FactTable2"
#         cb.layers.append(table)

#         f = cb.query("WHat is earth?")
#         self.assertEqual(f.response, real_answer)
#         ## Should stem in the second layer, earthing -> earth
#         f = cb.query("earthing?") 
#         self.assertEqual(f.response, real_answer)


class TestMultilayerScrut(unittest.TestCase):
    def test_fact_table_preprocessing(self):
        facts = load_facts()
        q = "What is Scrut’s pricing?"
        real_answer = facts.get(q).response
        table = get_fact_table(def_file, company_name="scrut", type=TableType.NORMAL)
        f = table.query(q)
        # print(f.response)
        self.assertEqual(f.response, real_answer)


if __name__ == "__main__":
    unittest.main()
