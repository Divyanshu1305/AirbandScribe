"""
AirbandScribe — Comprehensive Test Suite
Validates ATC phraseology normalization, audio chunking with overlap deduplication,
SQLite database persistence, and FastAPI REST endpoints.
"""

import os
import unittest
import numpy as np
from fastapi.testclient import TestClient

import atc_normalizer
from audio_chunker import AudioChunker, ChunkConfig, deduplicate_overlap_text
import database
from app import app


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


class TestDatabase(unittest.TestCase):
    def test_crud_lifecycle(self):
        database.init_db()
        test_id = database.save_transcription(
            filename="test_file.wav",
            text="United 426 test transcription",
            segments=[{"start": 0.0, "end": 2.5, "text": "United 426"}],
            language="en",
            processing_time_seconds=1.25,
            speech_duration_seconds=5.0,
            vad_enabled=True,
            noise_removal_enabled=True,
            device="cpu",
            timestamp="20261119_test",
            saved_transcription_file="output/test.json",
            filtered_full_path_rel="output/filtered.wav",
            denoised_full_path_rel="output/denoised.wav",
            intermediate_chunks=[]
        )
        self.assertIsInstance(test_id, int)

        # Retrieve by id
        record = database.get_transcription_by_id(test_id)
        self.assertIsNotNone(record)
        self.assertEqual(record["filename"], "test_file.wav")
        self.assertEqual(record["device"], "cpu")

        # Delete
        deleted = database.delete_transcription(test_id)
        self.assertTrue(deleted)
        self.assertIsNone(database.get_transcription_by_id(test_id))


class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_status_endpoint(self):
        res = self.client.get("/api/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("features", data)

    def test_history_endpoint(self):
        res = self.client.get("/transcriptions?page=1&limit=5")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("transcriptions", data)
        self.assertIn("total", data)


if __name__ == "__main__":
    unittest.main()

