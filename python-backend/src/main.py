import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import json
from pathlib import Path

# Add the src directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routes
from src.routes import upload_routes, chat_routes, health_routes, cors_proxy_routes

# Import initializer for PDF hash mapping
from src.routes.upload_routes import init_hash_map

# Setup logging
def setup_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

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
    logger.info(f"[{request.method}] {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    response = await call_next(request)
    return response

# Mount routes
app.include_router(upload_routes.router, prefix="/api/upload", tags=["upload"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["chat"])
app.include_router(health_routes.router, prefix="/health", tags=["health"])
app.include_router(cors_proxy_routes.router, prefix="/api/proxy", tags=["proxy"])

# Initialize PDF hash mapping on startup
@app.on_event("startup")
async def startup_event():
    # Initialize the PDF hash map
    init_hash_map()
    logger.info("PDF hash map initialized")

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
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True) 