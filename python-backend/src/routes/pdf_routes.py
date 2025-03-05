import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import tempfile
import uuid
from pathlib import Path
import time
import random
import logging

from src.config.logger import setup_logger
from src.services.pdf_service import PDFService

# Create router
router = APIRouter()

# Initialize logger
logger = setup_logger("pdf_routes")

# Get upload folder from environment
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
DEBUG_UPLOAD = os.getenv("DEBUG_UPLOAD", "false").lower() == "true"

# Ensure upload directory exists
upload_dir = Path(UPLOAD_FOLDER)
upload_dir.mkdir(parents=True, exist_ok=True)

# Initialize PDF service
pdf_service = PDFService()

# Test write permissions
try:
    test_file = upload_dir / "test-write-permissions.txt"
    with open(test_file, "w") as f:
        f.write("Testing write permissions")
    os.remove(test_file)
    logger.info("Upload directory has correct write permissions")
except Exception as e:
    logger.error(f"Cannot write to upload directory: {e}")

# Logging middleware
async def log_request_fields(request: Request):
    """Log request fields for debugging"""
    form = await request.form()
    logger.info("Received upload request with fields:", {
        "body": list(form.keys()),
        "files": [f.filename for f in form.values() if isinstance(f, UploadFile)]
    })

# File filter function
def is_valid_pdf(file: UploadFile) -> bool:
    """Check if the file is a valid PDF"""
    logger.info(f"Filtering file: {file.filename}, mimetype: {file.content_type}")
    
    allowed_mime_types = ["application/pdf"]
    allowed_extensions = [".pdf"]
    
    file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    
    is_valid = (file.content_type in allowed_mime_types or 
                file_extension in allowed_extensions)
    
    if is_valid:
        logger.info(f"File accepted: {file.filename}")
    else:
        logger.warn(f"File rejected: {file.filename} - invalid type or extension")
    
    return is_valid

# File upload endpoint
@router.post("/upload")
async def upload_pdf(
    request: Request,
    background_tasks: BackgroundTasks,
    pdf_file: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    # Log request information
    await log_request_fields(request)
    
    # Get the file from either field
    uploaded_file = pdf_file or file
    
    if not uploaded_file:
        logger.error("No file was uploaded")
        raise HTTPException(status_code=400, detail="No file was uploaded")
    
    # Validate the file
    if not is_valid_pdf(uploaded_file):
        logger.error(f"Invalid file type: {uploaded_file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique filename
    unique_suffix = f"{int(time.time())}-{random.randint(0, 1000000000)}"
    file_extension = os.path.splitext(uploaded_file.filename)[1].lower() or ".pdf"
    filename = f"{unique_suffix}{file_extension}"
    file_path = upload_dir / filename
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(uploaded_file.file, buffer)
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail="Error saving file")
    finally:
        uploaded_file.file.close()
    
    # Process the PDF in the background
    try:
        # Call the PDF service to process the file
        background_tasks.add_task(
            pdf_service.process_pdf,
            str(file_path),
            filename,
            uploaded_file.filename
        )
        
        return {
            "success": True,
            "filename": filename,
            "originalFilename": uploaded_file.filename,
            "path": str(file_path)
        }
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

# Get PDF info endpoint
@router.get("/info/{filename}")
async def get_pdf_info(filename: str):
    try:
        # Check if file exists
        file_path = upload_dir / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get file info
        info = pdf_service.get_pdf_info(str(file_path))
        return info
    except Exception as e:
        logger.error(f"Error getting PDF info: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting PDF info: {str(e)}")

# More endpoints will be added as needed 