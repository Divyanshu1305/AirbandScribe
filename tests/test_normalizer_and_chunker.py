"""
AirbandScribe — Normalizer & Chunker Unit Tests
Validates ICAO ATC phraseology regex replacements and audio chunking algorithms.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
import numpy as np

import atc_normalizer
from audio_chunker import AudioChunker, ChunkConfig, deduplicate_overlap_text


class TestATCNormalizer(unittest.TestCase):
    def test_runway_formatting(self):
        text = "cleared ILS runway two seven left approach"
        res = atc_normalizer.normalize_atc_text(text)
        self.assertIn("runway 27L", res)

    def test_heading_formatting(self):
        text = "turn right heading two niner zero maintain speed"
        res = atc_normalizer.normalize_atc_text(text)
        self.assertIn("heading 290", res)

    def test_flight_level_formatting(self):
        text = "climb and maintain flight level three two zero"
        res = atc_normalizer.normalize_atc_text(text)
        self.assertIn("FL320", res)

    def test_frequency_formatting(self):
        text = "contact tower on one one niner point one"
        res = atc_normalizer.normalize_atc_text(text)
        self.assertIn("119.1", res)

    def test_acronyms(self):
        text = "intercept the localiser cleared i l s"
        res = atc_normalizer.normalize_atc_text(text)
        self.assertIn("localizer", res)
        self.assertIn("ILS", res)


class TestAudioChunker(unittest.TestCase):
    def test_chunking_with_overlap(self):
        sr = 16000
        # 70 seconds of audio
        audio = np.zeros(70 * sr, dtype=np.float32)
        chunker = AudioChunker(ChunkConfig(chunk_duration=30.0, overlap_duration=5.0, sample_rate=sr))
        chunks = chunker.chunk_audio(audio)
        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0].start_time, 0.0)
        self.assertEqual(chunks[0].end_time, 30.0)
        self.assertEqual(chunks[1].start_time, 25.0)
        self.assertEqual(chunks[1].end_time, 55.0)
        self.assertEqual(chunks[2].start_time, 50.0)
        self.assertEqual(chunks[2].end_time, 70.0)

    def test_overlap_deduplication(self):
        prev_text = "cleared ILS runway 27L"
        curr_text = "runway 27L contact tower on 119.1"
        deduped = deduplicate_overlap_text(prev_text, curr_text)
        self.assertEqual(deduped, "contact tower on 119.1")


if __name__ == "__main__":
    unittest.main()
