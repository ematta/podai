#!/bin/bash

# PodAI Node.js Backend Setup Script

# Exit on error
set -e

echo "Setting up PodAI Node.js Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js version 18 or higher is required. Found version: $(node -v)"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo "Please edit .env file with your own settings."
fi

# Create uploads directory
mkdir -p uploads

# Build the project
echo "Building the project..."
npm run build

echo "Setup complete! You can now run the server with 'npm start' or 'npm run dev' for development."
