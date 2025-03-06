"""
Integration tests for the main FastAPI application.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os

@pytest.mark.asyncio
async def test_healthcheck_endpoint(client):
    """Test the root healthcheck endpoint."""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "OK"}

@pytest.mark.asyncio
async def test_cors_middleware_configuration(client):
    """Test CORS middleware is properly configured."""
    # Make an OPTIONS request to simulate a CORS preflight request
    headers = {
        "Origin": "http://localhost:8080",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    }
    response = client.options("/api/health/", headers=headers)
    
    # Check that CORS headers are properly set
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert "access-control-allow-methods" in response.headers
    assert "access-control-allow-headers" in response.headers
    
    # Check the specific CORS configuration
    assert response.headers["access-control-allow-origin"] == "http://localhost:8080"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "Content-Type" in response.headers["access-control-allow-headers"]

@pytest.mark.asyncio
async def test_request_logging_middleware(client):
    """Test that request logging middleware is working."""
    # Mock the logger
    with patch("src.main.logger") as mock_logger:
        # Make a simple request
        response = client.get("/health")
        
        # Check the response
        assert response.status_code == 200
        
        # Verify that the logger was called for request start and completion
        assert mock_logger.info.called
        
        # Extract the log messages
        log_messages = [call.args[0] for call in mock_logger.info.call_args_list]
        
        # Check for request logging patterns
        request_started = any("Request started" in msg for msg in log_messages)
        request_completed = any("Request completed" in msg for msg in log_messages)
        
        assert request_started
        assert request_completed

@pytest.mark.asyncio
async def test_middleware_error_handling(client):
    """Test error handling in the request logging middleware."""
    # Mock the logger
    with patch("src.main.logger") as mock_logger:
        # Mock call_next to raise an exception
        original_middleware = getattr(client.app, "_middleware", {}).get("http", [])[0]
        
        async def mock_call_next_error(request, call_next):
            # Simulate error in downstream middleware or route handler
            raise RuntimeError("Test middleware error")
        
        # Replace the middleware temporarily
        client.app._middleware["http"][0] = mock_call_next_error
        
        try:
            # Make a request that will trigger the error
            with pytest.raises(RuntimeError):
                client.get("/health")
            
            # Verify that the error was logged
            mock_logger.error.assert_called()
            
            # Check for error logging pattern
            error_logs = [call.args[0] for call in mock_logger.error.call_args_list]
            assert any("Request failed" in msg for msg in error_logs)
            
        finally:
            # Restore the original middleware
            client.app._middleware["http"][0] = original_middleware

@pytest.mark.asyncio
async def test_startup_and_shutdown_events():
    """Test application startup and shutdown events."""
    # Mock the logger
    with patch("src.main.logger") as mock_logger:
        # Mock other dependencies to prevent actual initialization
        with patch("src.main.Base.metadata.create_all"), \
             patch("src.routes.upload_routes.init_hash_map"):
            
            # Import the app to trigger startup events
            from src.main import app
            
            # Create a test client to trigger startup
            with TestClient(app) as test_client:
                # Verify startup logs
                startup_logs = [call.args[0] for call in mock_logger.info.call_args_list]
                assert any("Application starting up" in msg for msg in startup_logs)
                assert any("Database tables created" in msg for msg in startup_logs)
                assert any("PDF hash map initialized" in msg for msg in startup_logs)
                assert any("Application startup complete" in msg for msg in startup_logs)
            
            # Verify shutdown logs after context manager exit
            shutdown_logs = [call.args[0] for call in mock_logger.info.call_args_list]
            assert any("Application shutting down" in msg for msg in shutdown_logs)

@pytest.mark.asyncio
async def test_static_files_serving():
    """Test serving static files."""
    # Only run this test if the frontend dist directory exists
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../frontend/dist'))
    
    if os.path.exists(frontend_dist):
        # Test with real frontend files
        with patch("src.main.frontend_path", frontend_dist):
            from src.main import app
            with TestClient(app) as test_client:
                # Test serving the index.html for root path
                response = test_client.get("/")
                assert response.status_code == 200
                assert "text/html" in response.headers["content-type"]
        
        # Skip the test otherwise
        pytest.skip("Frontend dist directory not found, skipping static files test")
    
    # Test with mocked files
    with patch("pathlib.Path.exists", return_value=True), \
         patch("fastapi.responses.FileResponse", return_value=MagicMock(status_code=200)):
        
        from src.main import app
        with TestClient(app) as test_client:
            # Test serving a path that doesn't match an API route
            response = test_client.get("/some-frontend-route")
            assert response.status_code == 200 