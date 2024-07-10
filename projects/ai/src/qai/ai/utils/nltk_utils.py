import re
from typing import TYPE_CHECKING, Set, Union

import nltk

try:
    nltk.data.find("corpora/wordnet.zip")
except LookupError:
    nltk.download("wordnet")
try:
    nltk.data.find("corpora/stopwords")
except LookupError:
    nltk.download("stopwords")
try:
    nltk.data.find("taggers/averaged_perceptron_tagger.zip")
except LookupError:
    nltk.download("averaged_perceptron_tagger")

from nltk.corpus import stopwords, wordnet
from nltk.stem import SnowballStemmer
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.tokenize import wordpunct_tokenize

from .nltk_extras import contractions_dict, remove_words, word_maps

# if TYPE_CHECKING:
from qai.ai import Query

stopwords = {"english": set(stopwords.words("english"))}


contractions_re = re.compile("(%s)" % "|".join(contractions_dict.keys()))


def normalize(
    string_or_query: Union[str, Query],
    to_lower: bool = True,
    to_alphanumeric: bool = True,
    use_word_map: bool = True,
    remove_filler_words: bool = True,
    contractions: bool = True,
    stopwords: Union[bool, str] = True,
    stem: Union[bool, str] = False,
    lemma: Union[bool, str] = True,
    tag_pos: Union[bool, str] = True,
) -> Union[str, Query]:
    if isinstance(string_or_query, Query):
        is_query = True
        sentence = string_or_query.query
    else:
        is_query = False
        sentence = string_or_query
    if to_lower:
        sentence = lower(sentence)
    if contractions:
        sentence = expand_contractions(sentence)

    if to_alphanumeric:
        sentence = alphanumeric(sentence)

    tokens = wordpunct_tokenize(sentence)
    if stopwords:
        tokens = remove_stopwords(tokens)
    if remove_filler_words:
        tokens = [w for w in tokens if w not in remove_words]
    if use_word_map:
        tokens = [word_maps.get(w, w) for w in tokens]
    if tag_pos:
        pos = pos_tag(tokens)
    if lemma:
        tokens = lemmatize(tokens, pos)
    if stem:
        tokens = stemming(tokens)
    if is_query:
        string_or_query.query = " ".join(tokens)
        return string_or_query
    return " ".join(tokens)


def get_stopwords(language: str = "english") -> Set[str]:
    if language not in stopwords:
        stopwords[language] = set(stopwords.words(language))
    return stopwords[language]


def remove_stopwords(tokens: list[str], language: str = "english") -> list[str]:
    return [w for w in tokens if w not in get_stopwords(language)]


def alphanumeric(sentence: str) -> str:
    return re.sub(r"[^A-Za-z0-9 ]+", r"", sentence)


def lower(sentence: str) -> str:
    return sentence.lower()


def multiple_spaces(sentence: str) -> str:
    return re.sub(r"\s+", r" ", sentence)


def whitespace_to_spaces(sentence: str) -> str:
    return re.sub(r"\s", r" ", sentence)


def expand_contractions(sentence: str, contractions_dict=contractions_dict) -> str:
    def replace(match):
        return contractions_dict[match.group(0)]

    return contractions_re.sub(replace, sentence)


def stemming(tokens: list[str], language="english") -> list[str]:
    """
    Stemming is the process of reducing a word to its word stem,
    it can cause words to lose their meaning.
    """
    stemmer = SnowballStemmer(language)
    return [stemmer.stem(words_sent) for words_sent in tokens]


def lemmatize(tokens: list[str], parts_of_speech: list[str] = None) -> list[str]:
    """
    Lemmatization is the process of grouping together the inflected forms of a word
    so they can be analysed as a single item, identified by the word's lemma, or dictionary form.
    """
    lemmatizer = WordNetLemmatizer()
    if parts_of_speech:
        lemmas = []
        for w, p in parts_of_speech:
            np = get_wordnet_pos(p)
            if not np:
                lemmas.append(lemmatizer.lemmatize(w))
            else:
                lemmas.append(lemmatizer.lemmatize(w, pos=np))
        return lemmas
    return [lemmatizer.lemmatize(w) for w in tokens]


def pos_tag(tokens: list[str]) -> list[str]:
    return nltk.pos_tag(tokens)


def get_wordnet_pos(treebank_tag):
    if treebank_tag.startswith("J"):
        return wordnet.ADJ
    elif treebank_tag.startswith("V"):
        return wordnet.VERB
    elif treebank_tag.startswith("N"):
        return wordnet.NOUN
    elif treebank_tag.startswith("R"):
        return wordnet.ADV
    else:
        return ""
