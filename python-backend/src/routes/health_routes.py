import os
import sys
import time
import psutil
from fastapi import APIRouter, HTTPException, Request
from src.config.logger import setup_logger

# Create router
router = APIRouter()

# Initialize logger
logger = setup_logger("health_routes")

# Health check endpoint
@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "ok", "time": time.time()}

# Get system info for monitoring
@router.get("/system")
async def system_info():
    """Get system information for monitoring"""
    try:
        # Get memory info
        memory = psutil.virtual_memory()
        memory_info = {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used": memory.used,
            "free": memory.free
        }
        
        # Get CPU info
        cpu_info = {
            "percent": psutil.cpu_percent(interval=0.1),
            "count": psutil.cpu_count(),
            "physical_count": psutil.cpu_count(logical=False)
        }
        
        # Get disk info
        disk = psutil.disk_usage('/')
        disk_info = {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        }
        
        # Get environment info
        env_info = {
            "python_version": sys.version,
            "platform": sys.platform,
            "node_env": os.getenv("NODE_ENV", "development"),
            "port": os.getenv("PORT", "3000"),
            "upload_folder": os.getenv("UPLOAD_FOLDER", "uploads")
        }
        
        return {
            "status": "ok",
            "time": time.time(),
            "memory": memory_info,
            "cpu": cpu_info,
            "disk": disk_info,
            "environment": env_info
        }
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting system info: {str(e)}")

# Get deep health check that tests connections to other services
@router.get("/deep")
async def deep_health_check():
    """Deep health check that tests connections to other services"""
    status = {
        "api": "ok",
        "time": time.time()
    }
    
    # Check ChromaDB connection
    try:
        # Import here to avoid circular imports
        from src.services.pdf_service import PDFService
        pdf_service = PDFService()
        
        # Simple test of ChromaDB
        pdf_service.chroma_client.heartbeat()
        status["chromadb"] = "ok"
    except Exception as e:
        logger.error(f"ChromaDB health check failed: {e}")
        status["chromadb"] = "error"
        status["chromadb_error"] = str(e)
    
    # Check upload folder
    try:
        upload_folder = os.getenv("UPLOAD_FOLDER", "uploads")
        if os.path.isdir(upload_folder) and os.access(upload_folder, os.W_OK):
            status["uploads"] = "ok"
        else:
            status["uploads"] = "error"
            status["uploads_error"] = "Upload folder does not exist or is not writable"
    except Exception as e:
        logger.error(f"Upload folder health check failed: {e}")
        status["uploads"] = "error"
        status["uploads_error"] = str(e)
    
    return status 