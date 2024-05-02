import unittest
from dataclasses import dataclass
from typing import Dict, List

from qai.ai.utils.nltk_utils import normalize


class TestNLTK(unittest.TestCase):
    def test_sentence_normalize(self):
        sentence = "This is a test sentence."
        normalized_sentence = normalize(sentence)
        self.assertEqual(normalized_sentence, "test sentence")

    def test_removes_contractions(self):
        sentence = "We'll"
        normalized_sentence = normalize(sentence, stopwords=False)
        self.assertEqual(normalized_sentence, "we will")

    def test_removes_stopwords(self):
        sentence = "We'll be there!!!"
        normalized_sentence = normalize(sentence, stopwords=True)
        self.assertEqual(normalized_sentence, "")

    def test_removes_filler(self):
        sentence = "hmm umm"
        normalized_sentence = normalize(sentence, stopwords=True)
        self.assertEqual(normalized_sentence, "")


if __name__ == "__main__":
    unittest.main()
