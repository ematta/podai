# PodAI Python Backend

This is the Python backend for the PodAI application. It provides API endpoints for PDF processing, file uploads, and other functionality.

## Features

- PDF processing and text extraction
- File uploads and management
- Integration with ChromaDB for vector storage
- API health monitoring

## Requirements

- Python 3.11+
- FastAPI
- ChromaDB
- See `requirements.txt` for all dependencies

## Development

### Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   # Edit .env as needed
   ```

### Running Locally

```
uvicorn src.main:app --reload
```

The API will be available at http://localhost:3000 by default.

### API Documentation

When running the server, FastAPI automatically generates API documentation:
- OpenAPI Swagger UI: http://localhost:3000/docs
- ReDoc: http://localhost:3000/redoc

## Docker

### Building the Docker Image

```
docker build -t podai-backend .
```

### Running with Docker

```
docker run -p 3000:3000 podai-backend
```

### Docker Compose

See the main `docker-compose.yml` file in the project root.

## Environment Variables

- `PORT`: The port to run the server on (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (default: info)
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes (default: 50MB)
- `UPLOAD_FOLDER`: Directory to store uploaded files (default: /tmp/uploads)
- `CHROMA_HOST`: ChromaDB host (default: localhost)
- `CHROMA_PORT`: ChromaDB port (default: 8000)
- `CHROMA_PROTOCOL`: ChromaDB protocol (default: http)

## API Endpoints

- `/health`: Basic health check
- `/api/pdf/upload`: Upload PDF files
- `/api/files/upload`: Upload general files
- `/api/chat/send`: Send messages (placeholder)
- `/api/health/*`: Health and monitoring endpoints
- `/api/proxy/*`: CORS proxy for external services 