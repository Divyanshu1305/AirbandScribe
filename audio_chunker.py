"""
AirbandScribe — Overlapping Audio Chunking & Stitching Module.
Handles chunking long ATC audio files with configurable overlap to ensure
no boundary transmissions are dropped.
"""

import os
import math
import numpy as np
import soundfile as sf
import librosa
from dataclasses import dataclass, field
from typing import List, Dict, Callable, Optional, Any
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed


@dataclass
class ChunkConfig:
    chunk_duration: float = 30.0    # Duration of each chunk in seconds
    overlap_duration: float = 5.0   # Overlap between consecutive chunks in seconds
    sample_rate: int = 16000        # Audio sample rate in Hz


@dataclass
class AudioChunk:
    chunk_id: int
    start_time: float
    end_time: float
    audio_data: np.ndarray
    file_path: Optional[str] = None


class AudioChunker:
    """
    Slices audio signals or audio files into overlapping time chunks.
    """

    def __init__(self, config: Optional[ChunkConfig] = None):
        self.config = config or ChunkConfig()
        if self.config.overlap_duration >= self.config.chunk_duration:
            raise ValueError("Overlap duration must be strictly less than chunk duration.")

    def chunk_audio(self, audio: np.ndarray, sample_rate: Optional[int] = None) -> List[AudioChunk]:
        """
        Slice a 1D numpy audio array into overlapping AudioChunk objects.
        """
        sr = sample_rate or self.config.sample_rate
        chunk_samples = int(self.config.chunk_duration * sr)
        step_duration = self.config.chunk_duration - self.config.overlap_duration
        step_samples = int(step_duration * sr)
        total_samples = len(audio)

        chunks: List[AudioChunk] = []
        chunk_idx = 0

        while True:
            start_sample = chunk_idx * step_samples
            if start_sample >= total_samples:
                break

            end_sample = min(start_sample + chunk_samples, total_samples)
            chunk_data = audio[start_sample:end_sample]

            start_sec = round(start_sample / sr, 3)
            end_sec = round(end_sample / sr, 3)

            chunks.append(
                AudioChunk(
                    chunk_id=chunk_idx + 1,
                    start_time=start_sec,
                    end_time=end_sec,
                    audio_data=chunk_data
                )
            )

            if end_sample >= total_samples:
                break

            chunk_idx += 1

        return chunks

    def chunk_file(
        self,
        audio_path: str,
        output_dir: Optional[str] = None,
        prefix: str = "chunk"
    ) -> List[AudioChunk]:
        """
        Load audio file and split into chunks, optionally saving chunk WAVs to output_dir.
        """
        audio, sr = librosa.load(audio_path, sr=self.config.sample_rate, mono=True)
        chunks = self.chunk_audio(audio, sample_rate=sr)

        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            for c in chunks:
                chunk_file = os.path.join(output_dir, f"{prefix}_{c.chunk_id}_{c.start_time:.1f}-{c.end_time:.1f}.wav")
                sf.write(chunk_file, c.audio_data, sr)
                c.file_path = chunk_file

        return chunks


class ParallelAudioProcessor:
    """
    Executes worker tasks across audio chunks and aggregates results.
    """

    def __init__(self, chunker: AudioChunker, num_workers: int = 2):
        self.chunker = chunker
        self.num_workers = max(1, num_workers)

    def process_audio(
        self,
        audio_path: str,
        processing_func: Callable[[AudioChunk, dict], dict],
        pipeline_config: dict
    ) -> List[dict]:
        """
        Loads audio, breaks it into chunks, and executes processing_func on each chunk.
        """
        chunks = self.chunker.chunk_file(audio_path)
        if not chunks:
            return []

        results: List[dict] = [None] * len(chunks)  # type: ignore

        # If 1 worker or simple sequential processing
        if self.num_workers <= 1 or len(chunks) == 1:
            for i, chunk in enumerate(chunks):
                results[i] = processing_func(chunk, pipeline_config)
            return results

        # Process with thread pool (thread-safe for subprocess and I/O tasks)
        with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
            future_to_idx = {
                executor.submit(processing_func, chunk, pipeline_config): i
                for i, chunk in enumerate(chunks)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    results[idx] = future.result()
                except Exception as exc:
                    print(f"Error processing chunk {idx + 1}: {exc}")
                    results[idx] = {
                        "chunk_id": chunks[idx].chunk_id,
                        "start_time": chunks[idx].start_time,
                        "end_time": chunks[idx].end_time,
                        "text": "",
                        "segments": [],
                        "error": str(exc)
                    }

        return results

    def combine_results(
        self,
        results: List[dict],
        combine_func: Callable[[List[dict]], dict]
    ) -> dict:
        """
        Combines processed chunk results using the provided aggregation function.
        """
        return combine_func(results)


def deduplicate_overlap_text(prev_text: str, curr_text: str) -> str:
    """
    Removes duplicated words at the overlap boundary between consecutive chunks.
    Example:
      prev_text: "cleared ILS runway two"
      curr_text: "runway two seven maintain speed"
      result: "seven maintain speed"
    """
    prev_words = prev_text.strip().split()
    curr_words = curr_text.strip().split()

    if not prev_words or not curr_words:
        return curr_text.strip()

    # Look for matching suffix of prev_words with prefix of curr_words
    max_k = min(len(prev_words), len(curr_words), 12)
    for k in range(max_k, 0, -1):
        prev_suffix = [w.lower().strip(".,?!") for w in prev_words[-k:]]
        curr_prefix = [w.lower().strip(".,?!") for w in curr_words[:k]]
        if prev_suffix == curr_prefix:
            return " ".join(curr_words[k:])

    return curr_text.strip()

