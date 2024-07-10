import pytest

from qai.ai.utils.nltk_utils import normalize

def test_sentence_normalize():
    sentence = "This is a test sentence."
    normalized_sentence = normalize(sentence)
    assert normalized_sentence == "test sentence"

def test_removes_contractions():
    sentence = "We'll"
    normalized_sentence = normalize(sentence, stopwords=False)
    assert normalized_sentence == "we will"

def test_removes_stopwords():
    sentence = "We'll be there!!!"
    normalized_sentence = normalize(sentence, stopwords=True)
    assert normalized_sentence == ""

def test_removes_filler():
    sentence = "hmm umm"
    normalized_sentence = normalize(sentence, stopwords=True)
    assert normalized_sentence == ""

if __name__ == "__main__":
    pytest.main([__file__,"-W", "ignore:Module already imported:pytest.PytestWarning"])