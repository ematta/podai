import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import json
from pathlib import Path
import time

# Add the src directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routes
from src.routes import upload_routes, chat_routes, health_routes, cors_proxy_routes, auth_routes

# Import initializer for PDF hash mapping
from src.routes.upload_routes import init_hash_map

# Database setup
from src.models.database import Base, engine

# Use our enhanced logger
from src.config.logger import setup_logger

# Setup logging
logger = setup_logger("app")

# Create FastAPI app
app = FastAPI(
    title="PodAI API",
    description="API for PodAI application",
    version="1.0.0"
)

# CORS configuration
is_production = os.getenv("NODE_ENV") == "production"
origins = [
    "http://frontend", 
    "http://podai-frontend", 
    "http://frontend:80", 
    "http://podai-frontend:80",
    "http://localhost:8080",  # Frontend local development
    "http://localhost:8081",  # Backend local development
    "http://localhost:3000"   # Backend alternative port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Always allow credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],  # Allow all headers
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Generate a unique request ID
    request_id = f"{time.time()}-{os.urandom(4).hex()}"
    
    # Extract client IP
    client_host = request.client.host if request.client else "unknown"
    
    # Log the start of the request
    logger.info(f"Request started [ID:{request_id}] - {request.method} {request.url} from {client_host}")
    
    # Log headers if debug level
    if logger.isEnabledFor(logging.DEBUG):
        logger.debug(f"Request headers [ID:{request_id}]: {dict(request.headers)}")
    
    # Log request body if it's a POST or PUT and if debug level
    if request.method in ["POST", "PUT"] and logger.isEnabledFor(logging.DEBUG):
        try:
            body = await request.body()
            # Clone the request with the body content for the next middleware
            request._body = body
            
            # Try to decode as JSON, but handle binary data gracefully
            try:
                if body:
                    body_str = body.decode('utf-8')
                    if '/api/upload/' in str(request.url):
                        logger.debug(f"Request body [ID:{request_id}]: [Binary file data, length: {len(body)}]")
                    else:
                        logger.debug(f"Request body [ID:{request_id}]: {body_str}")
            except UnicodeDecodeError:
                logger.debug(f"Request body [ID:{request_id}]: [Binary data, length: {len(body)}]")
        except Exception as e:
            logger.warning(f"Failed to log request body [ID:{request_id}]: {str(e)}")
    
    # Time the request execution
    start_time = time.time()
    
    try:
        # Process the request
        response = await call_next(request)
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Log the completed request
        logger.info(f"Request completed [ID:{request_id}] - {request.method} {request.url} - Status: {response.status_code} - Time: {execution_time:.4f}s")
        
        return response
    except Exception as e:
        # Log any uncaught exceptions
        logger.error(f"Request failed [ID:{request_id}] - {request.method} {request.url} - Error: {str(e)}")
        raise

# Mount routes
app.include_router(upload_routes.router, prefix="/api/upload", tags=["upload"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["chat"])
app.include_router(health_routes.router, prefix="/api/health", tags=["health"])
app.include_router(cors_proxy_routes.router, prefix="/api/proxy", tags=["proxy"])
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])

# Initialize database and setup on startup
@app.on_event("startup")
async def startup_event():
    # Log application startup
    logger.info("Application starting up")
    logger.info(f"Environment: {os.getenv('NODE_ENV', 'development')}")
    logger.info(f"Log level: {os.getenv('LOG_LEVEL', 'info')}")
    
    # Create all database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
    
    # Initialize the PDF hash map
    init_hash_map()
    logger.info("PDF hash map initialized")
    
    logger.info("Application startup complete")

# Log shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")

# Simple health check endpoint
@app.get("/health")
async def health():
    return {"status": "OK"}

# Static files - serving the frontend
frontend_path = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) / "frontend" / "dist"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = frontend_path / "index.html"
        if (frontend_path / full_path).exists() and not full_path.startswith("api"):
            return FileResponse(str(frontend_path / full_path))
        return FileResponse(str(file_path))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3000))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True) 