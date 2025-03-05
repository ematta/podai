#!/bin/bash

# This script converts the PodAI backend from Node.js to Python

echo "Converting PodAI backend from Node.js to Python..."

# Make sure the Python backend is ready
if [ ! -d "python-backend" ]; then
  echo "Error: python-backend directory not found!"
  exit 1
fi

# Check if essential files exist
if [ ! -f "python-backend/requirements.txt" ] || [ ! -f "python-backend/src/main.py" ]; then
  echo "Error: Python backend files are missing!"
  exit 1
fi

# Create a backup of the node-backend
echo "Creating backup of node-backend..."
timestamp=$(date +%Y%m%d%H%M%S)
if [ -d "node-backend" ]; then
  mkdir -p backups
  tar -czf "backups/node-backend-$timestamp.tar.gz" node-backend
  echo "Backup created at backups/node-backend-$timestamp.tar.gz"
fi

# Stop any running containers
echo "Stopping any running containers..."
docker-compose down

# Install Python dependencies for local development
echo "Installing Python dependencies for local development..."
cd python-backend
if [ -f "requirements.txt" ]; then
  pip install -r requirements.txt
fi
cd ..

# Rebuild containers with the new Python backend
echo "Rebuilding containers with Python backend..."
docker-compose build backend

echo "Conversion completed successfully!"
echo "To start the application with the new Python backend, run: docker-compose up -d"
echo "To remove the old Node.js backend, run: rm -rf node-backend" 