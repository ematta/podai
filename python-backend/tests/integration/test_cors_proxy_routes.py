"""
Integration tests for CORS proxy routes.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json

@pytest.mark.asyncio
async def test_proxy_get_request(client):
    """Test proxying a GET request."""
    # Mock the httpx client response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.headers = {"Content-Type": "application/json"}
    mock_response.content = b'{"data": "test response"}'
    
    # Patch the httpx.AsyncClient.request method
    with patch("httpx.AsyncClient.request", return_value=mock_response):
        # Test data
        target_url = "https://api.example.com/data"
        encoded_url = target_url.replace("/", "%2F").replace(":", "%3A")
        
        # Make the request
        response = client.get(f"/api/proxy/get/{encoded_url}")
        
        # Check the response
        assert response.status_code == 200
        assert response.json() == {"data": "test response"}
        assert response.headers["Content-Type"] == "application/json"

@pytest.mark.asyncio
async def test_proxy_post_request(client):
    """Test proxying a POST request."""
    # Mock the httpx client response
    mock_response = MagicMock()
    mock_response.status_code = 201
    mock_response.headers = {"Content-Type": "application/json"}
    mock_response.content = b'{"result": "created"}'
    
    # Patch the httpx.AsyncClient.request method
    with patch("httpx.AsyncClient.request", return_value=mock_response):
        # Test data
        target_url = "https://api.example.com/data"
        encoded_url = target_url.replace("/", "%2F").replace(":", "%3A")
        post_data = {"key": "value"}
        
        # Make the request
        response = client.post(
            f"/api/proxy/post/{encoded_url}", 
            json=post_data
        )
        
        # Check the response
        assert response.status_code == 201
        assert response.json() == {"result": "created"}
        assert response.headers["Content-Type"] == "application/json"

@pytest.mark.asyncio
async def test_proxy_error_handling(client):
    """Test error handling in the proxy."""
    # Patch the httpx.AsyncClient.request method to raise an exception
    with patch("httpx.AsyncClient.request", side_effect=Exception("Connection error")):
        # Test data
        target_url = "https://api.example.com/data"
        encoded_url = target_url.replace("/", "%2F").replace(":", "%3A")
        
        # Make the request
        response = client.get(f"/api/proxy/get/{encoded_url}")
        
        # Check the response
        assert response.status_code == 500
        assert "Error proxying request" in response.json()["detail"]

@pytest.mark.asyncio
async def test_proxy_invalid_url(client):
    """Test proxying with an invalid URL."""
    # Test with an invalid URL format
    response = client.get("/api/proxy/get/not-a-valid-url")
    
    # Check the response
    assert response.status_code == 400
    assert "Invalid URL" in response.json()["detail"]

@pytest.mark.asyncio
async def test_proxy_text_response(client):
    """Test proxying a request that returns text instead of JSON."""
    # Mock the httpx client response with text content
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.headers = {"Content-Type": "text/plain"}
    mock_response.content = b'Plain text response'
    
    # Patch the httpx.AsyncClient.request method
    with patch("httpx.AsyncClient.request", return_value=mock_response):
        # Test data
        target_url = "https://api.example.com/text"
        encoded_url = target_url.replace("/", "%2F").replace(":", "%3A")
        
        # Make the request
        response = client.get(f"/api/proxy/get/{encoded_url}")
        
        # Check the response
        assert response.status_code == 200
        assert response.content == b'Plain text response'
        assert response.headers["Content-Type"] == "text/plain"

@pytest.mark.asyncio
async def test_proxy_http_error_response(client):
    """Test proxying a request that returns an HTTP error."""
    # Mock the httpx client response with an error status
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.headers = {"Content-Type": "application/json"}
    mock_response.content = b'{"error": "Not found"}'
    
    # Patch the httpx.AsyncClient.request method
    with patch("httpx.AsyncClient.request", return_value=mock_response):
        # Test data
        target_url = "https://api.example.com/not-found"
        encoded_url = target_url.replace("/", "%2F").replace(":", "%3A")
        
        # Make the request
        response = client.get(f"/api/proxy/get/{encoded_url}")
        
        # Check that the error status and body are passed through
        assert response.status_code == 404
        assert response.json() == {"error": "Not found"} 