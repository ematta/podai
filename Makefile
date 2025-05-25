\
.PHONY: all install_backend install_frontend build_frontend run_backend run_frontend dev clean lint_frontend lint_backend format_backend install build

all: install_backend install_frontend build_frontend run_backend

install_frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

install_backend:
	@echo "Installing backend dependencies..."
	uv sync

build_frontend:
	@echo "Building frontend application..."
	cd frontend && npm run build

run_backend:
	@echo "Starting backend server..."
	uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

run_frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

dev:
	@echo "Starting backend and frontend development servers..."
	@make run_backend & make run_frontend & wait
	@echo "Development servers stopped."

clean:
	@echo "Cleaning up..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	@echo "Clean up complete."

lint_frontend:
	@echo "Linting frontend code..."
	cd frontend && npm run lint

lint_backend:
	@echo "Linting backend code..."
	uv run ruff check .

format_backend:
	@echo "Formatting backend code..."
	uv run ruff format .

install: install_backend install_frontend

build: build_frontend
