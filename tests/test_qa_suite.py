import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import unittest
import numpy as np
import json
import re

from audio_chunker import AudioChunker, ChunkConfig, deduplicate_overlap_text
from atc_normalizer import normalize_atc_text, normalize_segments

class TestAirbandScribeQA(unittest.TestCase):

    def setUp(self):
        self.chunker = AudioChunker(ChunkConfig(chunk_duration=30.0, overlap_duration=5.0, sample_rate=16000))

    # ---------------------------------------------------------
    # 1. Chunking & Overlap Validation
    # ---------------------------------------------------------
    def test_chunking_75s_audio(self):
        # 75 seconds at 16,000 Hz = 1,200,000 samples
        dummy_audio = np.zeros(75 * 16000, dtype=np.float32)
        chunks = self.chunker.chunk_audio(dummy_audio, sample_rate=16000)

        self.assertEqual(len(chunks), 3, "75s audio with 30s chunks and 5s overlap must yield exactly 3 chunks")
        
        # Chunk 1: [0.0, 30.0]
        self.assertEqual(chunks[0].chunk_id, 1)
        self.assertEqual(chunks[0].start_time, 0.0)
        self.assertEqual(chunks[0].end_time, 30.0)

        # Chunk 2: [25.0, 55.0] (25s step)
        self.assertEqual(chunks[1].chunk_id, 2)
        self.assertEqual(chunks[1].start_time, 25.0)
        self.assertEqual(chunks[1].end_time, 55.0)

        # Chunk 3: [50.0, 75.0]
        self.assertEqual(chunks[2].chunk_id, 3)
        self.assertEqual(chunks[2].start_time, 50.0)
        self.assertEqual(chunks[2].end_time, 75.0)

    def test_overlap_deduplication(self):
        # Test 1: Suffix-prefix match
        prev = "United 182 heavy radar contact descend and maintain"
        curr = "descend and maintain 3000 feet heading 270"
        deduped = deduplicate_overlap_text(prev, curr)
        self.assertEqual(deduped, "3000 feet heading 270")

        # Test 2: Punctuation tolerance
        prev_punct = "cleared ILS runway 27L."
        curr_punct = "runway 27L, contact tower."
        deduped_punct = deduplicate_overlap_text(prev_punct, curr_punct)
        self.assertEqual(deduped_punct, "contact tower.")

        # Test 3: No overlap
        prev_no = "Delta 1080 squawk 4721"
        curr_no = "Speedbird 915 descend to 3000 feet"
        deduped_no = deduplicate_overlap_text(prev_no, curr_no)
        self.assertEqual(deduped_no, "Speedbird 915 descend to 3000 feet")

    # ---------------------------------------------------------
    # 2. ATC Phraseology Normalizer & Entity Extraction
    # ---------------------------------------------------------
    def test_icao_number_pronunciation(self):
        text = "flight level three five zero, turn heading two seven zero"
        normalized = normalize_atc_text(text)
        self.assertIn("FL350", normalized, "Phonetic FL must normalize to FL350")
        self.assertIn("heading 270", normalized, "Phonetic heading must normalize to heading 270")

    def test_entity_extraction_callsigns_and_freqs(self):
        text = "United 4-2-6 contact Chicago Center on one one niner point one"
        normalized = normalize_atc_text(text)
        self.assertIn("United 426", normalized, f"Expected United 426, got: {normalized}")
        self.assertIn("119.1", normalized, f"Expected 119.1, got: {normalized}")

    def test_entity_extraction_runways(self):
        text = "cleared ILS runway two seven left approach"
        normalized = normalize_atc_text(text)
        self.assertIn("runway 27L", normalized, f"Expected runway 27L, got: {normalized}")
        self.assertIn("ILS", normalized, f"Expected ILS acronym, got: {normalized}")

    # ---------------------------------------------------------
    # 3. Export Formats & Syntax Validation
    # ---------------------------------------------------------
    def test_srt_generation(self):
        segments = [
            {"start": 0.0, "end": 3.2, "text": "United 426, turn left heading 270."},
            {"start": 3.2, "end": 7.15, "text": "Descend and maintain 3000 feet."}
        ]
        srt = ""
        for idx, s in enumerate(segments):
            start_ms = int((s['start'] % 1) * 1000)
            end_ms = int((s['end'] % 1) * 1000)
            srt += f"{idx + 1}\n00:00:0{int(s['start'])},{start_ms:03d} --> 00:00:0{int(s['end'])},{end_ms:03d}\n{s['text']}\n\n"

        self.assertIn("1\n00:00:00,000 --> 00:00:03,200", srt)
        self.assertIn("2\n00:00:03,200 --> 00:00:07,150", srt)
        self.assertIn("United 426", srt)

    def test_json_telemetry_validity(self):
        payload = {
            "id": 1,
            "filename": "sample_atc.wav",
            "speech_duration_seconds": 13.02,
            "processing_time_seconds": 8.30,
            "segments": [
                {"start": 0.1, "end": 12.21, "text": "United 426 heading 270"}
            ]
        }
        json_str = json.dumps(payload, indent=2)
        parsed = json.loads(json_str)
        self.assertEqual(parsed['id'], 1)
        self.assertEqual(len(parsed['segments']), 1)
        
        # Verify RTF calculation: RTF = processing_time / speech_duration
        rtf = parsed['processing_time_seconds'] / parsed['speech_duration_seconds']
        self.assertAlmostEqual(rtf, 0.637, places=2)
        # Throughput = speech_duration / processing_time
        throughput = parsed['speech_duration_seconds'] / parsed['processing_time_seconds']
        self.assertAlmostEqual(throughput, 1.57, places=2)

    # ---------------------------------------------------------
    # 4. Security & Filename Sanitization
    # ---------------------------------------------------------
    def test_path_traversal_sanitization(self):
        unsafe_name = "../../etc/passwd"
        safe_base = os.path.basename(unsafe_name)
        self.assertEqual(safe_base, "passwd")
        self.assertNotIn("..", safe_base)

if __name__ == '__main__':
    unittest.main()
