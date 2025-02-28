.PHONY: setup install-backend install-frontend run-backend run-frontend run-all clean test test-backend test-e2e debug-backend debug-all

setup: install-backend install-frontend

install-backend:
	@echo "Installing Python dependencies..."
	cd backend && pip install -r requirements.txt

install-frontend:
	@echo "Installing Node.js dependencies..."
	cd frontend && npm install --legacy-peer-deps

run-backend:
	@echo "Starting backend server..."
	cd backend && source venv/bin/activate && flask run --port=8081

debug-backend:
	@echo "Starting backend server in DEBUG mode..."
	cd backend && source venv/bin/activate && \
	FLASK_APP=app.py FLASK_ENV=development FLASK_DEBUG=1 \
	python -m flask run --host=0.0.0.0 --port=8081 --debugger --reload

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
	cd backend && source venv/bin/activate && python -m pytest

test-e2e:
	@echo "Running end-to-end tests..."
	cd backend && source venv/bin/activate && python -m pytest tests/test_e2e.py -v

test:
	cd backend && \
	pytest -v --cov=src --cov-report=term-missing --cov-report=html:coverage_report

clean:
	@echo "Cleaning project..."
	rm -rf frontend/node_modules
	rm -rf backend/__pycache__
	rm -rf backend/instance
	rm -rf backend/uploads/*
