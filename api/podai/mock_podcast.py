"""
Mock podcast processing module for testing without calling expensive Segmind API
"""
import os
import uuid
import datetime
import time
import json
from .utils import cleanup_old_files, get_file_info

def create_mock_audio_file(temp_dir: str, filename: str) -> str:
    """
    Creates a mock audio file (simple WAV header + silence) for testing purposes
    """
    file_path = os.path.join(temp_dir, filename)
    
    # Create a minimal WAV file with silence (44.1kHz, 16-bit, mono, 3 seconds)
    sample_rate = 44100
    duration = 3  # seconds
    num_samples = sample_rate * duration
    
    # WAV header (44 bytes)
    wav_header = bytearray([
        # RIFF header
        0x52, 0x49, 0x46, 0x46,  # "RIFF"
        0x00, 0x00, 0x00, 0x00,  # File size (will be filled)
        0x57, 0x41, 0x56, 0x45,  # "WAVE"
        
        # Format chunk
        0x66, 0x6D, 0x74, 0x20,  # "fmt "
        0x10, 0x00, 0x00, 0x00,  # Chunk size (16)
        0x01, 0x00,              # Audio format (PCM)
        0x01, 0x00,              # Number of channels (1)
        0x44, 0xAC, 0x00, 0x00,  # Sample rate (44100)
        0x88, 0x58, 0x01, 0x00,  # Byte rate (44100 * 2)
        0x02, 0x00,              # Block align (2)
        0x10, 0x00,              # Bits per sample (16)
        
        # Data chunk
        0x64, 0x61, 0x74, 0x61,  # "data"
        0x00, 0x00, 0x00, 0x00,  # Data size (will be filled)
    ])
    
    # Calculate sizes
    data_size = num_samples * 2  # 2 bytes per sample (16-bit)
    file_size = 36 + data_size
    
    # Fill in the sizes
    wav_header[4:8] = file_size.to_bytes(4, 'little')
    wav_header[40:44] = data_size.to_bytes(4, 'little')
    
    # Write the file
    with open(file_path, 'wb') as f:
        f.write(wav_header)
        # Write silence (zeros)
        f.write(b'\x00' * data_size)
    
    return file_path

def mock_process_podcast(script: str, delay_seconds: float = 2.0):
    """
    Mock version of process_podcast that creates a fake audio file without calling Segmind API
    """
    print(f"🎭 MOCK MODE: Processing podcast script (length: {len(script)} chars)")
    
    # Simulate API processing time
    print(f"🎭 MOCK MODE: Simulating {delay_seconds}s processing delay...")
    time.sleep(delay_seconds)
    
    # Create temp directory if it doesn't exist
    temp_dir = "/workspaces/podai/temp"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Clean up old files before saving new ones
    cleanup_old_files(temp_dir, max_age_hours=24)
    
    # Generate unique filename with timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    filename = f"mock_podcast_{timestamp}_{unique_id}.wav"
    
    try:
        # Create mock audio file
        file_path = create_mock_audio_file(temp_dir, filename)
        
        # Get file metadata
        file_info = get_file_info(file_path)
        
        print(f"🎭 MOCK MODE: Mock audio file saved to: {file_path}")
        
        # Create mock response similar to real API
        mock_response = {
            "success": True,
            "file_path": file_path,
            "filename": filename,
            "content_type": "audio/wav",
            "file_info": file_info,
            "mock_mode": True,
            "script_length": len(script),
            "processing_time": delay_seconds
        }
        
        # Optionally save mock metadata
        metadata_filename = f"mock_metadata_{timestamp}_{unique_id}.json"
        metadata_path = os.path.join(temp_dir, metadata_filename)
        with open(metadata_path, 'w') as f:
            json.dump({
                "original_script": script[:500] + "..." if len(script) > 500 else script,
                "mock_response": mock_response,
                "timestamp": datetime.datetime.now().isoformat()
            }, f, indent=2)
        
        return mock_response
        
    except Exception as e:
        print(f"🎭 MOCK MODE: Error creating mock file: {str(e)}")
        return {"error": f"Mock processing failed: {str(e)}", "mock_mode": True}

def get_mock_status():
    """
    Returns current mock mode status and configuration
    """
    mock_enabled = os.getenv("PODCAST_MOCK_MODE", "false").lower() == "true"
    mock_delay = float(os.getenv("PODCAST_MOCK_DELAY", "2.0"))
    
    return {
        "mock_enabled": mock_enabled,
        "mock_delay": mock_delay,
        "segmind_api_available": bool(os.getenv("SEGMIND_API_KEY")),
        "environment": os.getenv("ENVIRONMENT", "development")
    }
