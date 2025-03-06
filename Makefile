.PHONY: setup install-backend install-frontend install-python-backend run-backend run-frontend run-python-backend run-all setup-env build-backend build-frontend build-python-backend build-all test-backend test-python-backend test-frontend test-frontend-unit test-frontend-e2e test-e2e test-all coverage-backend coverage-frontend coverage-python-backend coverage-all clean test-python-backend-unit test-python-backend-specific test-python-backend-verbose test-chat-routes test-health-routes test-upload-routes test-auth-utils

setup: install-frontend install-python-backend

setup-env:
	@echo "Setting up environment variables..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file. Please edit .env with your environment variables"; \
	else \
		echo ".env already exists"; \
	fi
	@if [ ! -f python-backend/.env ]; then \
		cp python-backend/.env.example python-backend/.env; \
		echo "Created python-backend/.env file. Please edit with your environment variables"; \
	else \
		echo "python-backend/.env already exists"; \
	fi

install-python-backend:
	@echo "Installing Python backend dependencies..."
	cd python-backend && pip install -r requirements.txt

install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

run-python-backend:
	@echo "Starting Python backend server..."
	cd python-backend && uvicorn src.main:app --reload --host 0.0.0.0 --port 3000

run-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

run-all:
	@echo "Starting both servers..."
	make -j 2 run-python-backend run-frontend

# Define common test environment variables
define TEST_ENV
PYTHONPATH=. LOG_DIR=./logs LANGCHAIN_CALLBACKS_BACKGROUND=false LANGCHAIN_TRACING_V2=false PYDANTIC_MEMOIZE_HASHABLE=false
endef

# Specific test targets for individual test files
test-chat-routes:
	@echo "Running chat routes tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v tests/integration/test_chat_routes.py

test-health-routes:
	@echo "Running health routes tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v tests/integration/test_health_routes.py

test-upload-routes:
	@echo "Running upload routes tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v tests/integration/test_upload_routes.py

test-auth-utils:
	@echo "Running auth utilities tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v tests/unit/test_auth_utils.py

# Testing groups by test type
test-python-backend:
	@echo "Running Python backend tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v

test-python-backend-unit:
	@echo "Running Python backend unit tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v tests/unit/

test-python-backend-integration:
	@echo "Running Python backend integration tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v tests/integration/

test-python-backend-verbose:
	@echo "Running Python backend tests with verbose output..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -vv

test-python-backend-specific:
	@echo "Running specific Python backend test file..."
	@mkdir -p python-backend/logs
	@read -p "Enter test file path (e.g. tests/integration/test_health_routes.py): " test_file; \
	cd python-backend && $(TEST_ENV) pytest -v $$test_file

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm test

test-frontend-unit:
	@echo "Running frontend unit tests only..."
	cd frontend && npm test

test-frontend-e2e:
	@echo "Running frontend end-to-end tests only..."
	cd frontend && npm run test:e2e:headed

test-e2e:
	@echo "Running end-to-end tests..."
	cd frontend && npx playwright install --with-deps chromium && npx playwright test --headed

test-all: test-python-backend test-frontend
	@echo "All tests completed"

coverage-python-backend:
	@echo "Running Python backend tests with coverage..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest --cov=src tests/

coverage-frontend:
	@echo "Running frontend tests with coverage..."
	cd frontend && npm run test:coverage

coverage-all: coverage-python-backend coverage-frontend
	@echo "All coverage tests completed"

clean:
	@echo "Cleaning up..."
	rm -rf python-backend/__pycache__
	rm -rf python-backend/.pytest_cache
	rm -rf python-backend/src/__pycache__
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	find . -name "*.pyc" -delete

build-python-backend:
	@echo "Building Python backend..."
	@echo "Python does not require a build step, but you can use this to run checks"
	cd python-backend && pip list --outdated

build-frontend:
	@echo "Building frontend production version..."
	cd frontend && npm run build

build-all: build-python-backend build-frontend
	@echo "Both backend and frontend built successfully!"

lint-python-backend:
	@echo "Linting Python backend..."
	cd python-backend && pylint src/ tests/

lint-frontend:
	@echo "Linting frontend..."
	cd frontend && npm run lint

lint-all: lint-python-backend lint-frontend
	@echo "All linting completed"

# Development helper for Google Auth testing
google-auth-test:
	@echo "Running Google Authentication integration tests..."
	@mkdir -p python-backend/logs
	cd python-backend && $(TEST_ENV) pytest -v tests/integration/test_google_auth.py
