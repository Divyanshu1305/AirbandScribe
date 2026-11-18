"""
ATC Audio Transcription Pipeline (CrispASR Engine)
Integrated with Butterworth Bandpass Filtering, Spectral Noise Reduction (noisereduce),
Voice Activity Detection (Silero VAD), Overlapping Chunking for Long Audio,
and Domain-Specific ATC Phraseology Normalization.
"""

import os
import shutil
import numpy as np
import librosa
import soundfile as sf
from typing import Dict, List, Tuple, Optional, Union, Any
import json
from pathlib import Path
import time
import argparse
import subprocess
import re
import datetime

from audio_chunker import AudioChunker, ChunkConfig, deduplicate_overlap_text
import atc_normalizer


class AudioTranscriptionPipeline:
    """
    Complete audio transcription pipeline for noisy ATC recordings:
    Filter + Noise Removal -> Voice Activity Detection -> CrispASR / Whisper Engine -> ATC Normalization
    """

    def __init__(
        self,
        exe_path: str = r"bin\cpu\crispasr.exe",
        model_path: str = r"models\ggufs\speech-model.gguf",
        sample_rate: int = 16000,
        use_gpu: bool = False,
        whisper_model: Optional[str] = None,
        parakeet_model_dir: Optional[str] = None,
        backend: Optional[str] = None
    ):
        """
        Initialize the transcription pipeline.
        Automatically resolves the appropriate binary, compute device, and GGUF model path.
        """
        self.sample_rate = sample_rate
        self.backend = "crispasr"
        self.use_gpu = use_gpu

        # Resolve binary path
        self.exe_path, self.actual_device = self._resolve_executable(exe_path, use_gpu)

        # Resolve model path
        self.model_path = self._resolve_model(model_path or whisper_model)

        print(f"Initializing ATC Transcription Pipeline:")
        print(f"  Executable:     {self.exe_path}")
        print(f"  Requested GPU:  {self.use_gpu}")
        print(f"  Actual Device:  {self.actual_device}")
        print(f"  Model Path:     {self.model_path}")
        print(f"  Sample Rate:    {self.sample_rate} Hz")

    def _resolve_executable(self, requested_path: str, use_gpu: bool) -> Tuple[str, str]:
        """
        Locates the crispasr executable based on platform and available binaries.
        Falls back smoothly between GPU and CPU versions.
        """
        candidates = []

        if requested_path and os.path.exists(requested_path):
            device = "cuda" if use_gpu and "cuda" in requested_path.lower() else "cpu"
            return os.path.abspath(requested_path), device

        # Target directories
        base_dir = os.path.dirname(os.path.abspath(__file__))

        if use_gpu:
            candidates.extend([
                os.path.join(base_dir, "bin", "cuda", "crispasr.exe"),
                os.path.join(base_dir, "bin", "cuda", "crispasr"),
            ])

        # CPU fallback candidates
        candidates.extend([
            os.path.join(base_dir, "bin", "cpu", "crispasr.exe"),
            os.path.join(base_dir, "bin", "cpu", "crispasr"),
            os.path.join(base_dir, "bin", "cpu", "crispasr-windows-x86_64-cpu-legacy", "crispasr.exe"),
            os.path.join(base_dir, "bin", "crispasr.exe"),
            os.path.join(base_dir, "bin", "crispasr"),
        ])

        # Check system PATH
        path_binary = shutil.which("crispasr.exe") or shutil.which("crispasr")
        if path_binary:
            candidates.append(path_binary)

        for cand in candidates:
            if os.path.exists(cand):
                device = "cuda" if ("cuda" in cand.lower() and use_gpu) else "cpu"
                return os.path.abspath(cand), device

        # Default fallback
        fallback = os.path.join(base_dir, "bin", "cpu", "crispasr.exe")
        return fallback, "cpu"

    def _resolve_model(self, requested_model: Optional[str]) -> str:
        """
        Locates the model file (GGUF or bin).
        """
        if requested_model and os.path.exists(requested_model):
            return os.path.abspath(requested_model)

        base_dir = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(base_dir, "models", "ggufs", "speech-model.gguf"),
            os.path.join(base_dir, "models", "speech-model.gguf"),
            os.path.join(base_dir, "models", "ggufs", "ggml-base.en.bin"),
            os.path.join(base_dir, "models", "ggufs", "ggml-tiny.en.bin"),
        ]

        for cand in candidates:
            if os.path.exists(cand):
                return os.path.abspath(cand)

        # Search recursively inside models folder for any .gguf or .bin
        models_dir = os.path.join(base_dir, "models")
        if os.path.exists(models_dir):
            for root, _, files in os.walk(models_dir):
                for f in files:
                    if f.endswith((".gguf", ".bin")):
                        return os.path.abspath(os.path.join(root, f))

        return os.path.join(base_dir, "models", "ggufs", "speech-model.gguf")

    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """
        Load audio file and resample to target sample rate (16kHz mono).
        """
        print(f"Loading audio from: {audio_path}")
        audio, sr = librosa.load(audio_path, sr=self.sample_rate, mono=True)
        return audio, sr

    def apply_bandpass_filter(
        self,
        audio: np.ndarray,
        lowcut: float = 100.0,
        highcut: float = 8000.0,
        order: int = 5
    ) -> np.ndarray:
        """
        Apply Butterworth Bandpass Filter to isolate frequencies relevant to human voice
        and suppress extreme low rumble and high-frequency radio static.
        """
        try:
            from scipy.signal import butter, lfilter

            nyq = 0.5 * self.sample_rate
            use_low = (lowcut > 0)
            use_high = (highcut < nyq)

            if not use_low and not use_high:
                return audio

            if use_low and use_high:
                low = lowcut / nyq
                high = highcut / nyq
                b, a = butter(order, [low, high], btype='band')
            elif use_low:
                low = lowcut / nyq
                b, a = butter(order, low, btype='high')
            else:
                high = highcut / nyq
                b, a = butter(order, high, btype='low')

            filtered = lfilter(b, a, audio)
            return filtered
        except Exception as e:
            print(f"Warning: Failed to apply bandpass filter: {e}")
            return audio

    def remove_noise(
        self,
        audio: np.ndarray,
        stationary: bool = True,
        prop_decrease: float = 0.75
    ) -> np.ndarray:
        """
        Remove background radio static and acoustic noise using spectral gating.
        """
        try:
            import noisereduce as nr
            denoised = nr.reduce_noise(
                y=audio,
                sr=self.sample_rate,
                stationary=stationary,
                prop_decrease=prop_decrease
            )
            return denoised
        except ImportError:
            print("Warning: noisereduce not installed. Skipping noise reduction.")
            return audio
        except Exception as e:
            print(f"Warning: Spectral noise reduction failed: {e}")
            return audio

    def transcribe(
        self,
        audio: Union[np.ndarray, str],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Transcribe audio using the crispasr inference wrapper.
        """
        import tempfile

        temp_wav_path = None
        if isinstance(audio, np.ndarray):
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                temp_wav_path = tmp.name
            sf.write(temp_wav_path, audio, self.sample_rate)
            audio_file_path = temp_wav_path
        else:
            audio_file_path = os.path.abspath(audio)

        try:
            # Domain-specific hotword biasing & ATC initial context prompt
            hotwords = (
                "ils,dme,localizer,runway,heading,knots,feet,thousand,"
                "altitude,approach,climb,descend,contact,tower,niner,flight level,"
                "cleared,roger,wilco,holding,squawk,radar,traffic,heavy,departure,center,ground,maintain"
            )
            initial_prompt = (
                "Air traffic control radio communications: runway, heading, altitude, flight level, "
                "cleared ILS approach, contact tower, Boeing, Airbus, Delta, United, American, Cessna, knots."
            )

            cmd = [
                self.exe_path,
                "-m", self.model_path,
                "-f", audio_file_path,
                "--vad",
                "--flush-after", "1",
                "-oj",              # Output json format with exact millisecond timestamps
                "-osrt",            # Also output srt for compatibility
                "-bs", "5",         # Beam search size 5
                "-l", language,     # Force English or requested language
                "--hotwords", hotwords,
                "--prompt", initial_prompt
            ]

            print(f"Running inference command: {os.path.basename(self.exe_path)} -m {os.path.basename(self.model_path)}")
            process_result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                check=False
            )

            stdout = process_result.stdout or ""
            stderr = process_result.stderr or ""

            if process_result.returncode != 0:
                print(f"Warning: crispasr exited with code {process_result.returncode}")
                if stderr:
                    print(f"Stderr:\n{stderr[:500]}")

            # Check for generated JSON output
            json_path_1 = audio_file_path + ".json"
            json_path_2 = os.path.splitext(audio_file_path)[0] + ".json"
            json_path_3 = audio_file_path + ".wav.json"

            segments: List[Dict[str, Any]] = []
            json_found = False

            for jpath in [json_path_1, json_path_2, json_path_3]:
                if os.path.exists(jpath):
                    segments = self._parse_json_file(jpath)
                    try:
                        os.remove(jpath)
                    except Exception:
                        pass
                    if segments:
                        json_found = True
                        break

            # Fallback to SRT output
            if not json_found:
                srt_path_1 = audio_file_path + ".srt"
                srt_path_2 = os.path.splitext(audio_file_path)[0] + ".srt"
                for spath in [srt_path_1, srt_path_2]:
                    if os.path.exists(spath):
                        segments = self._parse_srt_file(spath)
                        try:
                            os.remove(spath)
                        except Exception:
                            pass
                        if segments:
                            break

            # Fallback to parsing stdout directly if neither file was readable
            if not segments:
                if "-->" in stdout:
                    segments = self._parse_srt_content(stdout)
                else:
                    text_lines = []
                    for line in stdout.splitlines():
                        line_s = line.strip()
                        if line_s and not self._is_log_line(line_s):
                            clean = re.sub(r'^\[\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}\]\s*', '', line_s)
                            text_lines.append(clean.strip())
                    if text_lines:
                        full_t = " ".join(text_lines)
                        segments = [{"start": 0.0, "end": 0.0, "text": full_t}]

            # Clean and normalize ATC phraseology across segments
            segments = atc_normalizer.normalize_segments(segments)
            full_text = " ".join([s["text"] for s in segments if s.get("text")]).strip()

            return {
                "text": full_text,
                "segments": segments,
                "language": language
            }

        finally:
            if temp_wav_path and os.path.exists(temp_wav_path):
                try:
                    os.remove(temp_wav_path)
                except Exception:
                    pass

    def _parse_json_file(self, json_path: str) -> List[Dict[str, Any]]:
        """Parses crispasr -oj output file."""
        try:
            with open(json_path, 'r', encoding='utf-8', errors='ignore') as f:
                data = json.load(f)
            transcription = data.get("transcription", [])
            segments = []
            for item in transcription:
                text = item.get("text", "").strip()
                if not text:
                    continue
                offsets = item.get("offsets", {})
                start_sec = round(offsets.get("from", 0) / 1000.0, 2)
                end_sec = round(offsets.get("to", 0) / 1000.0, 2)
                segments.append({
                    "start": start_sec,
                    "end": end_sec,
                    "text": text
                })
            return segments
        except Exception as e:
            print(f"Warning: Failed to parse crispasr JSON file {json_path}: {e}")
            return []

    def _parse_srt_file(self, srt_path: str) -> List[Dict[str, Any]]:
        try:
            with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            return self._parse_srt_content(content)
        except Exception as e:
            print(f"Warning: Failed to read SRT file {srt_path}: {e}")
            return []

    def _parse_srt_content(self, content: str) -> List[Dict[str, Any]]:
        segments = []
        content = content.replace('\r\n', '\n')
        srt_pattern = re.compile(
            r'(?:\d+)\n(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})\n(.*?)(?=\n\s*\n|\n\d+\n|\Z)',
            re.DOTALL
        )
        matches = srt_pattern.findall(content)
        for start_str, end_str, text_content in matches:
            start_sec = self._parse_timestamp_to_seconds(start_str)
            end_sec = self._parse_timestamp_to_seconds(end_str)
            clean_lines = [line.strip() for line in text_content.strip().splitlines()]
            clean_text = " ".join([l for l in clean_lines if l]).strip()
            if clean_text:
                segments.append({
                    "start": round(start_sec, 2),
                    "end": round(end_sec, 2),
                    "text": clean_text
                })
        return segments

    def _parse_timestamp_to_seconds(self, ts_str: str) -> float:
        try:
            ts_str = ts_str.replace(',', '.')
            parts = ts_str.split(':')
            if len(parts) == 3:
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            elif len(parts) == 2:
                return float(parts[0]) * 60 + float(parts[1])
            return float(ts_str)
        except Exception:
            return 0.0

    def _is_log_line(self, line: str) -> bool:
        prefixes = [
            "system_info:", "whisper_init", "model", "main:", "whisper_",
            "llama_", "ggml_", "load_", "warning:", "error:", "info:", "output_"
        ]
        low = line.lower()
        return any(low.startswith(p) for p in prefixes)

    def process_audio(
        self,
        audio_path: str,
        apply_vad: bool = True,
        apply_noise_removal: bool = True,
        vad_threshold: float = 0.5,
        noise_reduction: float = 0.75,
        language: str = "en",
        save_intermediate: bool = True,
        output_dir: Optional[str] = "output",
        chunk_duration: float = 30.0,
        overlap_duration: float = 5.0
    ) -> Dict[str, Any]:
        """
        Complete processing pipeline:
        1. Load Audio
        2. Acoustic Preprocessing (Bandpass Butterworth + Spectral Noise Reduction)
        3. Automatic Overlapping Chunking for Long Recordings (>60s)
        4. Speech Transcription with Silero VAD & ATC Hotword Biasing
        5. Terminology Normalization & Overlap Deduplication
        6. Intermediate File Persistence
        """
        start_time = time.time()
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        # 1. Load Audio
        audio, sr = self.load_audio(audio_path)
        total_duration = len(audio) / self.sample_rate

        filtered_audio = audio
        denoised_audio = audio

        filtered_full_path = None
        filtered_full_path_rel = None
        denoised_full_path = None
        denoised_full_path_rel = None
        intermediate_chunks = []

        # 2. Preprocessing: Bandpass Filter + Spectral Noise Reduction
        if apply_noise_removal:
            print("Applying Butterworth bandpass filter (100Hz - 8000Hz)...")
            filtered_audio = self.apply_bandpass_filter(audio, lowcut=100.0, highcut=8000.0)

            if save_intermediate and output_dir:
                f_path = os.path.join(output_dir, f"filtered_full_{timestamp}.wav")
                sf.write(f_path, filtered_audio, self.sample_rate)
                filtered_full_path = os.path.abspath(f_path)
                filtered_full_path_rel = os.path.relpath(f_path).replace("\\", "/")

            print(f"Applying spectral noise reduction (coefficient {noise_reduction})...")
            denoised_audio = self.remove_noise(filtered_audio.copy(), prop_decrease=noise_reduction)

            if save_intermediate and output_dir:
                d_path = os.path.join(output_dir, f"denoised_full_{timestamp}.wav")
                sf.write(d_path, denoised_audio, self.sample_rate)
                denoised_full_path = os.path.abspath(d_path)
                denoised_full_path_rel = os.path.relpath(d_path).replace("\\", "/")

        # 3. Audio Chunking Configuration
        # Break into overlapping chunks:
        # If long recording (>60s), transcribe per chunk with overlap stitching
        chunker = AudioChunker(ChunkConfig(
            chunk_duration=chunk_duration,
            overlap_duration=overlap_duration,
            sample_rate=self.sample_rate
        ))
        chunks = chunker.chunk_audio(denoised_audio)
        filtered_chunks = chunker.chunk_audio(filtered_audio)

        # Save intermediate chunks to output directory if requested
        if save_intermediate and output_dir:
            for i, chunk in enumerate(chunks):
                c_num = chunk.chunk_id
                f_chunk_file = os.path.join(output_dir, f"filtered_chunk_{c_num}_{timestamp}.wav")
                d_chunk_file = os.path.join(output_dir, f"denoised_chunk_{c_num}_{timestamp}.wav")

                # Write filtered and denoised chunk audio
                if i < len(filtered_chunks):
                    sf.write(f_chunk_file, filtered_chunks[i].audio_data, self.sample_rate)
                sf.write(d_chunk_file, chunk.audio_data, self.sample_rate)

                intermediate_chunks.append({
                    "chunk_num": c_num,
                    "start_time": chunk.start_time,
                    "end_time": chunk.end_time,
                    "filtered_path": os.path.abspath(f_chunk_file),
                    "filtered_path_rel": os.path.relpath(f_chunk_file).replace("\\", "/"),
                    "denoised_path": os.path.abspath(d_chunk_file),
                    "denoised_path_rel": os.path.relpath(d_chunk_file).replace("\\", "/")
                })

        # 4. Transcription Execution
        # If recording is longer than 60s, transcribe chunk-by-chunk to maintain high accuracy
        if total_duration > 60.0 and len(chunks) > 1:
            print(f"Long recording detected ({total_duration:.1f}s). Transcribing in {len(chunks)} overlapping chunks...")
            all_segments: List[Dict[str, Any]] = []
            chunk_texts: List[str] = []

            for i, chunk in enumerate(chunks):
                print(f"Transcribing Chunk {chunk.chunk_id}/{len(chunks)} [{chunk.start_time:.1f}s - {chunk.end_time:.1f}s]...")
                res = self.transcribe(chunk.audio_data, language=language)

                c_text = res.get("text", "").strip()
                c_segments = res.get("segments", [])

                # Offset chunk segment timestamps by chunk.start_time
                for seg in c_segments:
                    all_segments.append({
                        "start": round(seg["start"] + chunk.start_time, 2),
                        "end": round(seg["end"] + chunk.start_time, 2),
                        "text": seg["text"]
                    })

                # Deduplicate overlap text with previous chunk
                if chunk_texts and c_text:
                    cleaned_chunk_text = deduplicate_overlap_text(chunk_texts[-1], c_text)
                    if cleaned_chunk_text:
                        chunk_texts.append(cleaned_chunk_text)
                elif c_text:
                    chunk_texts.append(c_text)

            final_text = " ".join(chunk_texts).strip()
            final_segments = all_segments
        else:
            # Single-pass transcription for short audio files
            print("Transcribing audio file in single pass...")
            res = self.transcribe(denoised_audio, language=language)
            final_text = res.get("text", "")
            final_segments = res.get("segments", [])

        # Ensure segments are sorted and normalized
        final_segments.sort(key=lambda x: x.get("start", 0))
        final_segments = atc_normalizer.normalize_segments(final_segments)
        final_text = atc_normalizer.normalize_atc_text(final_text)

        processing_time = round(time.time() - start_time, 2)

        output = {
            "text": final_text,
            "segments": final_segments,
            "language": language,
            "processing_time_seconds": processing_time,
            "speech_duration_seconds": round(total_duration, 2),
            "vad_enabled": apply_vad,
            "noise_removal_enabled": apply_noise_removal,
            "device": self.actual_device,
            "timestamp": timestamp,
            "filtered_full_path": filtered_full_path,
            "filtered_full_path_rel": filtered_full_path_rel,
            "denoised_full_path": denoised_full_path,
            "denoised_full_path_rel": denoised_full_path_rel,
            "intermediate_chunks": intermediate_chunks
        }

        print(f"Transcription complete in {processing_time}s on {self.actual_device.upper()}.")
        return output

    def save_transcription(self, result: Dict[str, Any], output_path: str):
        """Save transcription result to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Saved transcription record to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="ATC Audio Transcription Pipeline")
    parser.add_argument("audio_file", help="Path to input audio file")
    parser.add_argument("--model", default=r"models\ggufs\speech-model.gguf", help="Path to GGUF model")
    parser.add_argument("--exe_path", default=r"bin\cpu\crispasr.exe", help="Path to crispasr.exe")
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda"], help="Compute device")
    parser.add_argument("--output_dir", default="output", help="Directory to save output")
    parser.add_argument("--no_noise_removal", action="store_true", help="Disable noise removal")
    parser.add_argument("--noise_reduction", type=float, default=0.75, help="Noise reduction amount (0.0 to 1.0)")
    parser.add_argument("--language", default="en", help="Language code")

    args = parser.parse_args()

    pipeline = AudioTranscriptionPipeline(
        exe_path=args.exe_path,
        model_path=args.model,
        sample_rate=16000,
        use_gpu=(args.device == "cuda")
    )

    result = pipeline.process_audio(
        audio_path=args.audio_file,
        apply_noise_removal=not args.no_noise_removal,
        noise_reduction=args.noise_reduction,
        language=args.language,
        save_intermediate=True,
        output_dir=args.output_dir
    )

    timestamp = result.get("timestamp", datetime.datetime.now().strftime("%Y%m%d_%H%M%S"))
    out_file = os.path.join(args.output_dir, f"{Path(args.audio_file).stem}_transcription_{timestamp}.json")
    pipeline.save_transcription(result, out_file)
    print("\nResult text:\n", result["text"])


if __name__ == "__main__":
    main()
