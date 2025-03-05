import os
import hashlib
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse
import time
import uuid
import json
from datetime import datetime
from src.config.logger import setup_logger

# Create a router
router = APIRouter()

# Initialize logger
logger = setup_logger("upload_routes")

# Configure upload folder from environment variable or use default
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "/tmp/uploads")

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Dictionary to store processed PDFs by MD5 hash
PDF_HASH_MAP = {}

@router.post("/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file and return a unique file ID.
    Now with MD5 hash checking to avoid duplicates.
    """
    upload_id = str(uuid.uuid4())
    upload_start_time = time.time()
    
    logger.info(f"PDF upload started [ID:{upload_id}] - Filename: {file.filename}")
    
    if not file.filename.lower().endswith('.pdf'):
        logger.warning(f"Rejected non-PDF upload [ID:{upload_id}] - Filename: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Create a temporary file path
        timestamp = int(time.time())
        random_id = str(uuid.uuid4().int)[:8]  # Use part of a UUID for uniqueness
        file_id = f"{timestamp}-{random_id}.pdf"
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        # Read the file content for MD5 calculation
        logger.debug(f"Reading file contents [ID:{upload_id}]")
        contents = await file.read()
        file_size = len(contents)
        logger.info(f"File read complete [ID:{upload_id}] - Size: {file_size} bytes")
        
        # Calculate MD5 hash
        md5_hash = hashlib.md5(contents).hexdigest()
        logger.debug(f"MD5 hash calculated [ID:{upload_id}]: {md5_hash}")
        
        # Check if we've already processed this PDF
        if md5_hash in PDF_HASH_MAP:
            existing_file_id = PDF_HASH_MAP[md5_hash]
            logger.info(f"Duplicate PDF detected [ID:{upload_id}] - Using existing file ID: {existing_file_id}")
            
            # Return the existing file ID
            upload_time = time.time() - upload_start_time
            logger.info(f"PDF upload completed [ID:{upload_id}] in {upload_time:.2f}s - Duplicate file")
            return {
                "success": True, 
                "fileId": existing_file_id,
                "isDuplicate": True
            }
        
        # If not duplicate, save the file
        logger.debug(f"Saving file [ID:{upload_id}] to: {file_path}")
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Store the MD5 hash mapping
        PDF_HASH_MAP[md5_hash] = file_id
        
        # Record file metadata
        upload_time = time.time() - upload_start_time
        logger.info(f"PDF upload completed [ID:{upload_id}] in {upload_time:.2f}s - File ID: {file_id}, Size: {file_size} bytes")
        
        return {
            "success": True,
            "fileId": file_id,
            "isDuplicate": False
        }
        
    except Exception as e:
        upload_time = time.time() - upload_start_time
        logger.error(f"PDF upload failed [ID:{upload_id}] after {upload_time:.2f}s - Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/list")
async def list_pdfs():
    """
    List all uploaded PDFs
    """
    request_id = str(uuid.uuid4())
    logger.info(f"PDF list requested [ID:{request_id}]")
    
    try:
        # Create a list to store file info
        files = []
        
        # Walk through the upload directory
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.endswith('.pdf'):
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                stat_info = os.stat(file_path)
                
                files.append({
                    "fileId": filename,
                    "size": stat_info.st_size,
                    "uploadedAt": datetime.fromtimestamp(stat_info.st_mtime).isoformat()
                })
        
        logger.info(f"PDF list completed [ID:{request_id}] - Found {len(files)} files")
        return {"success": True, "files": files}
        
    except Exception as e:
        logger.error(f"PDF list failed [ID:{request_id}] - Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

def init_hash_map():
    """
    Initialize the PDF hash map by scanning existing files
    """
    init_id = str(uuid.uuid4())
    logger.info(f"Initializing PDF hash map [ID:{init_id}]")
    
    try:
        # Clear the existing map
        PDF_HASH_MAP.clear()
        
        # Walk through the upload directory
        file_count = 0
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.endswith('.pdf'):
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                
                # Calculate MD5 hash
                with open(file_path, "rb") as f:
                    md5_hash = hashlib.md5(f.read()).hexdigest()
                
                # Store in the hash map
                PDF_HASH_MAP[md5_hash] = filename
                file_count += 1
        
        logger.info(f"PDF hash map initialized [ID:{init_id}] - {file_count} files indexed")
    except Exception as e:
        logger.error(f"PDF hash map initialization failed [ID:{init_id}] - Error: {str(e)}")
        # Don't re-raise the exception, just log it
        # We don't want to prevent the app from starting 