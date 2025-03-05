import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import tempfile
from pathlib import Path
import time
import random

from src.config.logger import setup_logger

# Create router
router = APIRouter()

# Initialize logger
logger = setup_logger("file_upload_routes")

# Get upload folder from environment
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")

# Ensure upload directory exists
upload_dir = Path(UPLOAD_FOLDER)
upload_dir.mkdir(parents=True, exist_ok=True)

# File upload endpoint
@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...)
):
    logger.info(f"File upload received: {file.filename}")
    
    if not file:
        logger.error("No file was uploaded")
        raise HTTPException(status_code=400, detail="No file was uploaded")
    
    # Generate unique filename
    unique_suffix = f"{int(time.time())}-{random.randint(0, 1000000000)}"
    file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    filename = f"{unique_suffix}{file_extension}"
    file_path = upload_dir / filename
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail="Error saving file")
    finally:
        file.file.close()
    
    return {
        "success": True,
        "filename": filename,
        "originalFilename": file.filename,
        "path": str(file_path)
    }

# Get file info endpoint
@router.get("/info/{filename}")
async def get_file_info(filename: str):
    try:
        # Check if file exists
        file_path = upload_dir / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get file stats
        stats = os.stat(file_path)
        file_info = {
            "file_path": str(file_path),
            "file_name": filename,
            "file_size": stats.st_size,
            "created_at": stats.st_ctime,
            "modified_at": stats.st_mtime
        }
        
        return file_info
    except Exception as e:
        logger.error(f"Error getting file info: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting file info: {str(e)}")

# Delete file endpoint
@router.delete("/{filename}")
async def delete_file(filename: str):
    try:
        # Check if file exists
        file_path = upload_dir / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete the file
        os.remove(file_path)
        
        return {"success": True, "message": f"File {filename} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

# List files endpoint
@router.get("/list")
async def list_files():
    try:
        files = []
        for file_path in upload_dir.glob("*"):
            if file_path.is_file():
                stats = file_path.stat()
                files.append({
                    "filename": file_path.name,
                    "path": str(file_path),
                    "size": stats.st_size,
                    "created_at": stats.st_ctime,
                    "modified_at": stats.st_mtime
                })
        
        return {"files": files}
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}") 