import requests
import time
import json
import os

def test_transcription():
    url = 'http://127.0.0.1:8000/transcribe'
    audio_file = os.path.join('test-files', 'sample_atc.wav')

    if not os.path.exists(audio_file):
        print(f"File {audio_file} not found!")
        return False

    print(f"Testing live ingestion of {audio_file} ({os.path.getsize(audio_file)} bytes)...")
    t0 = time.time()
    with open(audio_file, 'rb') as f:
        files = {'file': (audio_file, f, 'audio/wav')}
        data = {
            'apply_noise_removal': 'true',
            'noise_reduction': '0.75',
            'language': 'en',
            'save_intermediate': 'true',
            'device': 'cpu'
        }
        res = requests.post(url, files=files, data=data, timeout=60)
    dur = time.time() - t0
    print(f"HTTP Status: {res.status_code} in {dur:.2f}s")

    if not res.ok:
        print(f"Error response: {res.text}")
        return False

    data = res.json()
    print(f"Database Record ID: {data.get('id')}")
    print(f"Filename: {data.get('filename')}")
    print(f"Speech Duration: {data.get('speech_duration_seconds')}s")
    print(f"Processing Time: {data.get('processing_time_seconds')}s")
    print(f"Throughput Factor: {(data.get('speech_duration_seconds', 1) / (data.get('processing_time_seconds', 1) or 1)):.2f}x")
    print(f"Filtered Audio Path: {data.get('filtered_full_path_rel')}")
    print(f"Denoised Audio Path: {data.get('denoised_full_path_rel')}")
    
    # Verify files on disk
    filt_path = data.get('filtered_full_path_rel')
    denoise_path = data.get('denoised_full_path_rel')
    assert os.path.exists(filt_path), f"Filtered file {filt_path} missing!"
    assert os.path.exists(denoise_path), f"Denoised file {denoise_path} missing!"
    print("✓ Filtered and Denoised audio files verified on disk.")

    segments = data.get('segments', [])
    print(f"Decoded Transmission Segments: {len(segments)}")
    for i, s in enumerate(segments):
        print(f"  Segment #{i+1}: [{s.get('start'):.2f}s -> {s.get('end'):.2f}s] \"{s.get('text')}\"")

    assert len(segments) > 0, "No segments decoded!"
    assert "United" in data.get('text', '') or "heading" in data.get('text', ''), "Expected ATC keywords missing!"
    print("✓ Transcription accuracy and ICAO keywords validated.")
    return True

if __name__ == '__main__':
    success = test_transcription()
    print("Overall Test Success:", success)
