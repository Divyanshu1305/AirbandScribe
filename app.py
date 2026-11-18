import os
import tempfile
import uvicorn
import math
import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from transcribe_atc import AudioTranscriptionPipeline
import database

# Initialize SQLite database
database.init_db()

app = FastAPI(
    title="AirbandScribe ASR Intelligence API",
    description="High-precision Aeronautical VHF Automatic Speech Recognition & Acoustic Signal Intelligence Engine.",
    version="1.2.0"
)

# Enable CORS for decoupled local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output directory for intermediate audio files & transcription logs
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Serve output directory statically
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")

# Serve pre-built React frontend assets if compiled
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/api/status")
def read_status():
    """
    Returns system status, active compute device capabilities, and pipeline features.
    """
    has_cuda = os.path.exists("bin/cuda/crispasr.exe") or os.path.exists("bin/cuda/crispasr")
    has_cpu = os.path.exists("bin/cpu/crispasr.exe") or os.path.exists("bin/cpu/crispasr")
    has_model = os.path.exists("models/ggufs/speech-model.gguf")

    return {
        "status": "online",
        "service": "AirbandScribe VHF Intelligence Engine",
        "version": "1.2.0",
        "codename": "STARS-ECHELON",
        "airband": "VHF AM 118.000 - 136.975 MHz",
        "features": [
            "Butterworth Bandpass Filter (100Hz - 8000Hz)",
            "Spectral Gating Noise Reduction (noisereduce)",
            "Silero Voice Activity Detection (VAD)",
            "Automatic Overlapping Chunk Processing for Long Recordings",
            "ATC Domain Phraseology Normalizer (Runways, Headings, FL, Callsigns)",
            "SQLite Transcription Persistence & History Tracking"
        ],
        "hardware": {
            "cuda_available": has_cuda,
            "cpu_available": has_cpu,
            "speech_model_ready": has_model
        }
    }


@app.get("/")
def read_root():
    """
    Serves the React single page app if built, or returns status JSON.
    """
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return read_status()


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    apply_noise_removal: bool = Form(True),
    noise_reduction: float = Form(0.75),
    language: str = Form("en"),
    save_intermediate: bool = Form(True),
    device: str = Form("cpu")
):
    """
    Upload and transcribe an ATC audio recording.
    Handles bandpass filtering, spectral noise reduction, VAD, overlapping chunking,
    and saves transcription metrics (filename, time, duration, CPU/GPU) to SQLite.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    # Save uploaded file to a temporary file
    suffix = Path(file.filename).suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        temp_input_path = tmp.name

    try:
        content = await file.read()
        with open(temp_input_path, "wb") as f:
            f.write(content)

        use_gpu = (device.lower() == "cuda")
        exe_path = "bin/cuda/crispasr.exe" if use_gpu else "bin/cpu/crispasr.exe"

        req_pipeline = AudioTranscriptionPipeline(
            exe_path=exe_path,
            model_path="models/ggufs/speech-model.gguf",
            sample_rate=16000,
            use_gpu=use_gpu
        )

        # Process audio through full pipeline (Bandpass + Denoise + VAD + Chunking + Inference + ATC normalizer)
        result = req_pipeline.process_audio(
            audio_path=temp_input_path,
            apply_vad=True,
            apply_noise_removal=apply_noise_removal,
            noise_reduction=noise_reduction,
            language=language,
            save_intermediate=save_intermediate,
            output_dir=OUTPUT_DIR,
            chunk_duration=30.0,
            overlap_duration=5.0
        )

        # Save transcription JSON record to output folder
        timestamp = result.get("timestamp", datetime.datetime.now().strftime("%Y%m%d_%H%M%S"))
        original_name = Path(file.filename).stem
        json_output_path = os.path.join(OUTPUT_DIR, f"{original_name}_transcription_{timestamp}.json")
        req_pipeline.save_transcription(result, json_output_path)

        actual_device = result.get("device", req_pipeline.actual_device)

        response_data = {
            "text": result.get("text", ""),
            "segments": result.get("segments", []),
            "language": result.get("language", language),
            "processing_time_seconds": result.get("processing_time_seconds", 0.0),
            "speech_duration_seconds": result.get("speech_duration_seconds", 0.0),
            "vad_enabled": result.get("vad_enabled", True),
            "noise_removal_enabled": result.get("noise_removal_enabled", True),
            "device": actual_device,
            "timestamp": timestamp,
            "saved_transcription_file": json_output_path,
            "filtered_full_path": result.get("filtered_full_path"),
            "filtered_full_path_rel": result.get("filtered_full_path_rel"),
            "denoised_full_path": result.get("denoised_full_path"),
            "denoised_full_path_rel": result.get("denoised_full_path_rel"),
            "intermediate_chunks": result.get("intermediate_chunks", [])
        }

        # Save record to SQLite database
        try:
            inserted_id = database.save_transcription(
                filename=file.filename,
                text=response_data["text"],
                segments=response_data["segments"],
                language=response_data["language"],
                processing_time_seconds=response_data["processing_time_seconds"],
                speech_duration_seconds=response_data["speech_duration_seconds"],
                vad_enabled=response_data["vad_enabled"],
                noise_removal_enabled=response_data["noise_removal_enabled"],
                device=response_data["device"],
                timestamp=response_data["timestamp"],
                saved_transcription_file=response_data["saved_transcription_file"],
                filtered_full_path_rel=response_data["filtered_full_path_rel"],
                denoised_full_path_rel=response_data["denoised_full_path_rel"],
                intermediate_chunks=response_data["intermediate_chunks"]
            )
            response_data["id"] = inserted_id
        except Exception as db_err:
            print(f"Warning: Failed to persist record to database: {db_err}")

        return response_data

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    finally:
        if os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
            except Exception:
                pass


@app.get("/transcriptions")
def get_transcriptions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None
):
    """
    Returns a paginated list of past transcriptions with metadata (filename, duration, time, CPU/GPU).
    """
    transcriptions, total = database.get_transcriptions(page, limit, search=search)
    pages = math.ceil(total / limit) if total > 0 else 1
    return {
        "transcriptions": transcriptions,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }


@app.get("/transcriptions/{id}")
def get_transcription(id: int):
    """
    Retrieves full details, segments, and audio file paths for a specific transcription ID.
    """
    record = database.get_transcription_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return record


@app.delete("/transcriptions/{id}")
def delete_transcription(id: int):
    """
    Deletes a transcription from the history database and removes its generated files if found.
    """
    record = database.get_transcription_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")

    # Attempt to clean up stored files
    for path_key in ["saved_transcription_file", "filtered_full_path_rel", "denoised_full_path_rel"]:
        file_path = record.get(path_key)
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    success = database.delete_transcription(id)
    return {"success": success, "deleted_id": id}


@app.get("/{full_path:path}")
async def serve_spa_or_static(full_path: str):
    """
    Catch-all route to serve static frontend files or fallback to React's index.html.
    """
    if os.path.exists(FRONTEND_DIST):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Route not found")


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
