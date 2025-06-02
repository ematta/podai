\
.PHONY: all install_backend install_frontend build_frontend run_backend run_frontend dev clean lint_frontend lint_backend format_backend install build mock_on mock_off mock_status test_mock

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

# Mock mode management
mock_on:
	@echo "🎭 Enabling mock mode..."
	@python toggle_mock.py on

mock_off:
	@echo "🚀 Disabling mock mode..."
	@python toggle_mock.py off

mock_status:
	@echo "📊 Mock mode status:"
	@python toggle_mock.py status

test_mock:
	@echo "🧪 Testing mock mode..."
	@make mock_on
	@echo "Running test with mock mode..."
	@uv run python test_podcast_api.py
