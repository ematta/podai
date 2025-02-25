.PHONY: setup install-backend install-frontend run-backend run-frontend run-all clean

setup: install-backend install-frontend

install-backend:
	@echo "Installing Python dependencies..."
	cd backend && pip install -r requirements.txt

install-frontend:
	@echo "Installing Node.js dependencies..."
	cd frontend && npm install --legacy-peer-deps

run-backend:
	@echo "Starting backend server..."
	cd backend && source .venv/bin/activate && flask run

run-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

run-all:
	@echo "Starting both servers..."
	make -j 2 run-backend run-frontend

clean:
	@echo "Cleaning project..."
	rm -rf frontend/node_modules
	rm -rf backend/__pycache__
	rm -rf backend/instance
	rm -rf backend/uploads/*
