"""
Integration tests for health routes.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import time
import psutil

# We don't need to patch the health routes, but including this comment for consistency
# with other test files that might need the MockLLMService

@pytest.mark.asyncio
async def test_health_check_endpoint(client):
    """Test the basic health check endpoint."""
    response = client.get("/api/health/")
    
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "time" in response.json()

@pytest.mark.asyncio
async def test_system_info_endpoint(client):
    """Test the system info endpoint."""
    response = client.get("/api/health/system")
    
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    
    # Check for expected system info fields
    system_info = response.json()
    assert "memory" in system_info
    assert "cpu" in system_info
    assert "disk" in system_info
    assert "environment" in system_info
    
    # Check for specific memory info
    memory_info = system_info["memory"]
    assert "total" in memory_info
    assert "available" in memory_info
    assert "percent" in memory_info
    
    # Check for specific CPU info
    cpu_info = system_info["cpu"]
    assert "percent" in cpu_info
    assert "count" in cpu_info
    
    # Check for specific disk info
    disk_info = system_info["disk"]
    assert "total" in disk_info

@pytest.mark.asyncio
async def test_system_info_error_handling(client):
    """Test handling errors in the system info endpoint."""
    with patch("psutil.virtual_memory", side_effect=Exception("Test error")):
        response = client.get("/api/health/system")
        
        assert response.status_code == 500
        assert "Error getting system info" in response.json()["detail"]

@pytest.mark.asyncio
async def test_deep_health_check_all_services_ok(client):
    """Test the deep health check when all services are working."""
    # Create a mock ChromaDB client and PDF service
    mock_client = MagicMock()
    mock_client.heartbeat.return_value = 1
    
    # Create mock PDF service instance
    mock_pdf_service = MagicMock()
    mock_pdf_service.chroma_client = mock_client
    
    # Mock both the PDFService class and the instance check
    with patch("src.services.pdf_service.PDFService", return_value=mock_pdf_service), \
         patch("os.path.isdir", return_value=True), \
         patch("os.access", return_value=True):
        
        response = client.get("/api/health/deep")
        
        assert response.status_code == 200
        health_check = response.json()
        
        assert health_check["api"] == "ok"
        assert health_check["chromadb"] == "ok"
        assert health_check["uploads"] == "ok"
        assert "time" in health_check

@pytest.mark.asyncio
async def test_deep_health_check_chromadb_failure(client):
    """Test the deep health check when ChromaDB is not available."""
    # Create a mock that raises an exception
    mock_client = MagicMock()
    mock_client.heartbeat.side_effect = Exception("ChromaDB connection error")
    
    # Create mock PDF service instance with failing client
    mock_pdf_service = MagicMock()
    mock_pdf_service.chroma_client = mock_client
    
    # Mock both the PDFService class and the instance check
    with patch("src.services.pdf_service.PDFService", return_value=mock_pdf_service), \
         patch("os.path.isdir", return_value=True), \
         patch("os.access", return_value=True):
        
        response = client.get("/api/health/deep")
        
        assert response.status_code == 200
        health_check = response.json()
        
        assert health_check["api"] == "ok"
        assert health_check["chromadb"] == "error"
        assert "chromadb_error" in health_check
        assert health_check["uploads"] == "ok"

@pytest.mark.asyncio
async def test_deep_health_check_uploads_failure(client):
    """Test the deep health check when uploads directory is not available."""
    # Create a mock ChromaDB client and PDF service
    mock_client = MagicMock()
    mock_client.heartbeat.return_value = 1
    
    # Create mock PDF service instance 
    mock_pdf_service = MagicMock()
    mock_pdf_service.chroma_client = mock_client
    
    # Mock the PDFService class and the uploads directory check to fail
    with patch("src.services.pdf_service.PDFService", return_value=mock_pdf_service), \
         patch("os.path.isdir", return_value=False):
        
        response = client.get("/api/health/deep")
        
        assert response.status_code == 200
        health_check = response.json()
        
        assert health_check["api"] == "ok"
        assert health_check["chromadb"] == "ok"
        assert health_check["uploads"] == "error"
        assert "uploads_error" in health_check 