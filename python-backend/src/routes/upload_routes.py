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

# Create a router
router = APIRouter()

# Initialize logger
logger = logging.getLogger(__name__)

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
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Create a temporary file path
        timestamp = int(time.time())
        random_id = str(uuid.uuid4().int)[:8]  # Use part of a UUID for uniqueness
        file_id = f"{timestamp}-{random_id}.pdf"
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        # Read the file content for MD5 calculation
        contents = await file.read()
        
        # Calculate MD5 hash
        md5_hash = hashlib.md5(contents).hexdigest()
        
        # Check if we've already processed this PDF
        if md5_hash in PDF_HASH_MAP:
            logger.info(f"PDF with MD5 {md5_hash} already exists, returning existing file ID: {PDF_HASH_MAP[md5_hash]}")
            return {"fileId": PDF_HASH_MAP[md5_hash], "duplicate": True}
        
        # If not a duplicate, save the file
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Store the MD5 hash mapping
        PDF_HASH_MAP[md5_hash] = file_id
        
        # Save the MD5 hash mapping to a persistent file
        try:
            hash_map_file = os.path.join(UPLOAD_FOLDER, "pdf_hash_map.json")
            
            # Load existing map if exists
            existing_map = {}
            if os.path.exists(hash_map_file):
                with open(hash_map_file, "r") as f:
                    existing_map = json.load(f)
            
            # Update with new hash
            existing_map[md5_hash] = file_id
            
            # Save back to file
            with open(hash_map_file, "w") as f:
                json.dump(existing_map, f)
        except Exception as e:
            logger.error(f"Error saving hash map: {e}")
        
        logger.info(f"PDF uploaded successfully: {file_id} with MD5: {md5_hash}")
        return {"fileId": file_id, "duplicate": False}
        
    except Exception as e:
        logger.error(f"Error uploading PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading PDF: {str(e)}")

@router.get("/list")
async def list_pdfs():
    """
    List all uploaded PDF files.
    """
    try:
        files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.pdf')]
        
        # Try to load the hash map if it exists
        hash_map_file = os.path.join(UPLOAD_FOLDER, "pdf_hash_map.json")
        if os.path.exists(hash_map_file):
            with open(hash_map_file, "r") as f:
                PDF_HASH_MAP.update(json.load(f))
        
        return {"pdf_ids": files}
    except Exception as e:
        logger.error(f"Error listing PDFs: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing PDFs: {str(e)}")

# Initialize the hash map on startup
def init_hash_map():
    try:
        hash_map_file = os.path.join(UPLOAD_FOLDER, "pdf_hash_map.json")
        if os.path.exists(hash_map_file):
            with open(hash_map_file, "r") as f:
                PDF_HASH_MAP.update(json.load(f))
            logger.info(f"Loaded {len(PDF_HASH_MAP)} PDF hash mappings from {hash_map_file}")
    except Exception as e:
        logger.error(f"Error initializing hash map: {e}")

# Initialize hash map when module is loaded
init_hash_map() 