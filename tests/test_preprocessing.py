import unittest

from preprocessing import grams, preprocess, tokenize


class PreprocessingTests(unittest.TestCase):
    def test_preprocessing_helpers_are_public_and_deterministic(self):
        self.assertEqual(tokenize('The runners were RUNNING, and cats!'),
                         ['runners', 'running', 'cats'])
        self.assertEqual(preprocess('The runners were RUNNING, and cats!'),
                         ['runner', 'run', 'cat'])
        self.assertEqual(grams('index', 3), {'ind', 'nde', 'dex'})


if __name__ == '__main__':
    unittest.main()
