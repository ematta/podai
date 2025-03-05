.PHONY: setup install-backend install-frontend run-backend run-backend-low-tokens run-frontend run-all run-all-low-tokens clean test test-backend test-frontend test-frontend-unit test-frontend-e2e test-e2e test-all coverage-backend coverage-frontend coverage-all debug-backend debug-all setup-env build-backend build-frontend build-all profile-backend profile-backend-snapshot profile-frontend profile-all

setup: install-backend install-frontend

setup-env:
	@echo "Setting up environment variables..."
	@if [ ! -f node-backend/.env ]; then \
		cp node-backend/.env.example node-backend/.env; \
		echo "Created .env file. Please edit node-backend/.env and add your Hugging Face API token"; \
	else \
		echo "node-backend/.env already exists"; \
	fi

install-backend:
	@echo "Installing Node.js backend dependencies..."
	cd node-backend && npm install

install-frontend:
	@echo "Installing Node.js dependencies..."
	cd frontend && npm install --legacy-peer-deps

run-backend:
	@echo "Starting Node.js backend server with high token limit (4096)..."
	cd node-backend && LLM_MAX_LENGTH=4096 npm run dev

run-backend-low-tokens:
	@echo "Starting Node.js backend server with reduced token limit (2048)..."
	cd node-backend && LLM_MAX_LENGTH=2048 npm run dev

debug-backend:
	@echo "Starting Node.js backend server in DEBUG mode with high token limit (4096)..."
	cd node-backend && NODE_ENV=development LOG_LEVEL=debug LLM_MAX_LENGTH=4096 npm run dev

run-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

run-all:
	@echo "Starting both servers..."
	make -j 2 run-backend run-frontend

run-all-low-tokens:
	@echo "Starting both servers with reduced token limit (2048)..."
	make -j 2 run-backend-low-tokens run-frontend

debug-all:
	@echo "Starting both servers in DEBUG mode..."
	make -j 2 debug-backend run-frontend

test-backend:
	@echo "Running backend tests..."
	docker-compose build backend-test
	docker-compose run --rm backend-test

test-frontend:
	@echo "Running frontend tests..."
	docker-compose build frontend-test
	docker-compose run --rm frontend-test

test-frontend-unit:
	@echo "Running frontend unit tests only..."
	cd frontend && npx vitest run --exclude tests/e2e

test-frontend-e2e:
	@echo "Running frontend end-to-end tests only..."
	docker-compose build frontend-test
	docker-compose run --rm frontend-test npm run test:e2e

test-e2e:
	@echo "Running end-to-end tests..."
	cd frontend && npx playwright install --with-deps chromium && npx playwright test --headed

test-all:
	@echo "Running all tests..."
	make test-backend
	make test-frontend
	@echo "All tests completed"

coverage-backend:
	@echo "Running backend tests with coverage..."
	cd node-backend && npm run test:coverage

coverage-frontend:
	@echo "Running frontend tests with coverage..."
	cd frontend && npm run test:coverage

coverage-all: coverage-backend coverage-frontend
	@echo "All coverage tests completed"

clean:
	@echo "Cleaning up..."
	rm -rf node-backend/dist
	rm -rf frontend/dist
	rm -rf node-backend/node_modules
	rm -rf frontend/node_modules

build-backend:
	@echo "Building Node.js backend..."
	cd node-backend && npm run build

build-frontend:
	@echo "Building frontend production version..."
	cd frontend && npm run build

build-all: build-backend build-frontend
	@echo "Both backend and frontend built successfully!"

# Memory profiling targets
profile-backend:
	@echo "Starting backend with memory profiling..."
	cd node-backend && ENABLE_PROFILING=true PROFILE_INTERVAL=30000 NODE_OPTIONS="--max-old-space-size=4096" npm run dev

profile-backend-snapshot:
	@echo "Taking heap snapshot of the running backend..."
	cd node-backend && npx tsx src/scripts/profile-memory.ts

profile-frontend:
	@echo "Starting frontend with memory profiling..."
	cd frontend && VITE_ENABLE_PROFILING=true npm run dev

profile-all:
	@echo "Starting both backend and frontend with memory profiling..."
	cd node-backend && ENABLE_PROFILING=true NODE_OPTIONS="--max-old-space-size=4096" npm run dev & \
	cd frontend && VITE_ENABLE_PROFILING=true npm run dev

# Docker commands
.PHONY: docker-build docker-build-backend docker-build-frontend docker-up docker-down docker-logs docker-ps

docker-build: docker-build-backend docker-build-frontend
	@echo "Docker images built successfully!"

docker-build-backend:
	@echo "Building backend Docker image..."
	docker-compose build backend

docker-build-frontend:
	@echo "Building frontend Docker image..."
	docker-compose build frontend

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	@echo "Showing Docker logs..."
	docker-compose logs -f

docker-ps:
	@echo "Listing Docker containers..."
	docker-compose ps

# Kubernetes commands
.PHONY: k8s-install k8s-upgrade k8s-uninstall k8s-status k8s-forward-backend k8s-forward-frontend

k8s-install:
	@echo "Installing Kubernetes resources..."
	helm install podai ./kubernetes/charts/podai

k8s-upgrade:
	@echo "Upgrading Kubernetes resources..."
	helm upgrade podai ./kubernetes/charts/podai

k8s-uninstall:
	@echo "Uninstalling Kubernetes resources..."
	helm uninstall podai

k8s-status:
	@echo "Checking Kubernetes status..."
	helm status podai

k8s-forward-backend:
	@echo "Port forwarding backend service to localhost:3000..."
	kubectl port-forward svc/podai-backend 3000:3000

k8s-forward-frontend:
	@echo "Port forwarding frontend service to localhost:8080..."
	kubectl port-forward svc/podai-frontend 8080:80

# Build the test Docker image
test-backend-docker-build:
	docker build -t backend-tests -f node-backend/Dockerfile.test ./node-backend

# Run the tests in Docker
test-backend-docker: test-backend-docker-build
	docker run --rm backend-tests

# Run tests with file watching in Docker
test-backend-docker-watch: test-backend-docker-build
	docker run --rm backend-tests npm run test:watch

# Clean up test containers and images
test-backend-docker-clean:
	docker rmi backend-tests || true

# Add this to your existing test targets if you want to run both local and Docker tests
test: test-backend test-backend-docker
