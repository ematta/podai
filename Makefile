\
# Makefile for PodAI

.PHONY: all install_frontend install_backend build_frontend run clean

# Default target: install dependencies, build frontend, and run the backend
all: install_backend install_frontend build_frontend run

# Install frontend dependencies
install_frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Install backend dependencies using uv
install_backend:
	@echo "Installing backend dependencies..."
	uv sync

# Build the frontend application
build_frontend:
	@echo "Building frontend application..."
	cd frontend && npm run build

# Run the backend server using uv and uvicorn
run:
	@echo "Starting backend server..."
	uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Clean up build artifacts and caches
clean:
	@echo "Cleaning up..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	@echo "Clean up complete."

# Lint frontend code
lint_frontend:
	@echo "Linting frontend code..."
	cd frontend && npm run lint

# Lint backend code (assuming ruff is or will be used)
# install_lint_backend:
# 	uv pip install ruff
lint_backend:
	@echo "Linting backend code..."
	uv run ruff check .
format_backend:
	@echo "Formatting backend code..."
	uv run ruff format .

# A target to install all dependencies
install: install_backend install_frontend

# A target to build everything
build: build_frontend
