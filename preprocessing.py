"""Deterministic text normalization helpers shared by both indexes."""

import re

from nltk.stem import PorterStemmer


# Embedded to keep preprocessing reproducible without downloading NLTK corpora.
STOP_WORDS = frozenset('''a an the and or but if while of at by for with about against
between into through during before after above below to from up down in out on off
over under again further then once here there when where why how all any both each
few more most other some such no nor not only own same so than too very can will
just should now i me my myself we our ours ourselves you your yours yourself
yourselves he him his himself she her hers herself it its itself they them their
theirs themselves what which who whom this that these those am is are was were be
been being have has had having do does did doing would could shall may might must
s t don doesn didn isn aren wasn weren won wouldn couldn shouldn ll ve re d m'''.split())
STEMMER = PorterStemmer()


def tokenize(text, remove_stopwords=True):
    """Lowercase Unicode alphanumeric words, splitting punctuation and underscores."""
    return [word for word in re.findall(r'[^\W_]+', text.lower())
            if not remove_stopwords or word not in STOP_WORDS]


def preprocess(text):
    """Return searchable stems after tokenization and stop-word removal."""
    return [STEMMER.stem(word) for word in tokenize(text)]


def grams(word, size):
    """Return unique contiguous character N-grams of a word."""
    return {word[i:i + size] for i in range(len(word) - size + 1)}
