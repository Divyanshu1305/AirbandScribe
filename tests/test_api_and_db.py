"""
AirbandScribe — API & Database Integration Test Suite
Validates SQLite database persistence lifecycle and FastAPI REST endpoints.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from fastapi.testclient import TestClient

import database
from app import app


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
