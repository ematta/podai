.PHONY: setup install-backend install-frontend run-backend run-frontend run-all clean test test-backend test-e2e debug-backend debug-all setup-env build-backend build-frontend build-all

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
	@echo "Starting Node.js backend server..."
	cd node-backend && npm run dev

debug-backend:
	@echo "Starting Node.js backend server in DEBUG mode..."
	cd node-backend && NODE_ENV=development LOG_LEVEL=debug npm run dev

run-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

run-all:
	@echo "Starting both servers..."
	make -j 2 run-backend run-frontend

debug-all:
	@echo "Starting both servers in DEBUG mode..."
	make -j 2 debug-backend run-frontend

test-backend:
	@echo "Running backend tests..."
	cd node-backend && npm test

test-e2e:
	@echo "Running end-to-end tests..."
	cd frontend && npm install @playwright/test && npx playwright install --with-deps chromium && npm run test:headed

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
