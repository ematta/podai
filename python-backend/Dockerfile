FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install additional dependencies for PDF processing
RUN pip install --no-cache-dir \
    psutil \
    unstructured[pdf]

# Copy the application code
COPY src/ ./src/

# Create upload directory with proper permissions
RUN mkdir -p /tmp/uploads && chmod 777 /tmp/uploads

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=3000
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV MAX_UPLOAD_SIZE=50000000
ENV UPLOAD_FOLDER=/tmp/uploads
ENV CHROMA_HOST=chromadb
ENV CHROMA_PORT=8000
ENV CHROMA_PROTOCOL=http

# Expose the port
EXPOSE 3000

# Set the command to run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3000"]

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1 