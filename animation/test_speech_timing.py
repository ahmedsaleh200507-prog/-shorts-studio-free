import unittest
from speech_timing import edge_word, estimate_words, validate_words

class SpeechTimingTests(unittest.TestCase):
    def test_real_edge_tick_conversion_retains_gaps(self):
        first = edge_word({'type':'WordBoundary','offset':1000000,'duration':3000000,'text':'Guten'})
        second = edge_word({'type':'WordBoundary','offset':8000000,'duration':4000000,'text':'Morgen'})
        self.assertEqual(first, {'text':'Guten','start':.1,'end':.4})
        self.assertAlmostEqual(second['end'], 1.2)
        validate_words([first, second], 1.5)
        self.assertIsNone(edge_word({'type':'SentenceBoundary'}))

    def test_estimation_handles_unicode_but_is_not_alignment(self):
        words = estimate_words('Grüße für Schüler!', 2)
        self.assertEqual([w['text'] for w in words], ['Grüße','für','Schüler!'])
        validate_words(words, 2)
        self.assertAlmostEqual(words[-1]['end'], 2)

    def test_bad_or_unordered_boundaries_are_rejected(self):
        for words in [[{'start':0,'end':3}], [{'start':.5,'end':.8},{'start':.2,'end':.3}]]:
            with self.assertRaises(ValueError):
                validate_words(words, 1)

if __name__ == '__main__':
    unittest.main()
