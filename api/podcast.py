from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

from api.podai.podcast import process_podcast

router = APIRouter()

class PodcastRequest(BaseModel):
    script: str

@router.post("/conversion", tags=["podcast"])
async def podcast_processing(request_body: PodcastRequest):
    print(f"Received podcast script: {request_body.script[:100]}...")
    return process_podcast(request_body.script)

@router.get("/download/{filename}", tags=["podcast"])
async def download_podcast_file(filename: str):
    """Download a generated podcast file from the temp directory"""
    temp_dir = "/workspaces/podai/temp"
    file_path = os.path.join(temp_dir, filename)
    
    # Security check: ensure filename doesn't contain path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=400, detail="Path is not a file")
    
    # Determine media type based on file extension
    if filename.endswith('.wav'):
        media_type = "audio/wav"
    elif filename.endswith('.mp3'):
        media_type = "audio/mpeg"
    elif filename.endswith('.json'):
        media_type = "application/json"
    elif filename.endswith('.txt'):
        media_type = "text/plain"
    else:
        media_type = "application/octet-stream"
    
    try:
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")

@router.get("/files", tags=["podcast"])
async def list_podcast_files():
    """List all available podcast files in the temp directory"""
    temp_dir = "/workspaces/podai/temp"
    
    if not os.path.exists(temp_dir):
        return {"files": []}
    
    try:
        files = []
        for filename in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "created_at": stat.st_ctime,
                    "download_url": f"/api/podcast/download/{filename}"
                })
        
        # Sort by creation time (newest first)
        files.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")