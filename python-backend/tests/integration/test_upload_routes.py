"""
Integration tests for file upload routes.
"""
import pytest
import io
import os
import hashlib
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import time
from pathlib import Path

@pytest.mark.asyncio
async def test_upload_pdf_new_file(client, mock_upload_dir, mock_pdf_hash_map):
    """Test uploading a new PDF file."""
    # Create a mock PDF file
    mock_pdf_content = b"%PDF-1.5\nTest PDF content"
    mock_pdf = io.BytesIO(mock_pdf_content)
    
    # Calculate expected MD5 hash
    expected_md5 = hashlib.md5(mock_pdf_content).hexdigest()
    
    # Make the upload request
    response = client.post(
        "/api/upload/pdf",
        files={"file": ("test.pdf", mock_pdf, "application/pdf")}
    )
    
    assert response.status_code == 200
    result = response.json()
    
    assert result["success"] is True
    assert "fileId" in result
    assert result["isDuplicate"] is False
    
    # Check that the file was saved
    file_id = result["fileId"]
    file_path = mock_upload_dir / file_id
    assert file_path.exists()
    
    # Check that the hash map was updated
    assert expected_md5 in mock_pdf_hash_map
    assert mock_pdf_hash_map[expected_md5] == file_id
    
    # Verify file content
    with open(file_path, "rb") as f:
        saved_content = f.read()
    assert saved_content == mock_pdf_content

@pytest.mark.asyncio
async def test_upload_pdf_duplicate_file(client, mock_upload_dir, mock_pdf_hash_map):
    """Test uploading a duplicate PDF file."""
    # Create a mock PDF file
    mock_pdf_content = b"%PDF-1.5\nTest PDF content"
    mock_pdf = io.BytesIO(mock_pdf_content)
    
    # Calculate MD5 hash
    pdf_md5 = hashlib.md5(mock_pdf_content).hexdigest()
    
    # Pre-populate the hash map with a known file ID
    existing_file_id = "123456-test.pdf"
    mock_pdf_hash_map[pdf_md5] = existing_file_id
    
    # Make the upload request
    response = client.post(
        "/api/upload/pdf",
        files={"file": ("test.pdf", mock_pdf, "application/pdf")}
    )
    
    assert response.status_code == 200
    result = response.json()
    
    assert result["success"] is True
    assert result["fileId"] == existing_file_id
    assert result["isDuplicate"] is True
    
    # The file should not be written again
    assert len(list(mock_upload_dir.iterdir())) == 0

@pytest.mark.asyncio
async def test_upload_non_pdf_file(client, mock_upload_dir, mock_pdf_hash_map):
    """Test uploading a non-PDF file (should be rejected)."""
    # Create a mock text file
    mock_file = io.BytesIO(b"This is not a PDF file")
    
    # Make the upload request
    response = client.post(
        "/api/upload/pdf",
        files={"file": ("test.txt", mock_file, "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Only PDF files are allowed" in response.json()["detail"]
    
    # No files should be saved
    assert len(list(mock_upload_dir.iterdir())) == 0
    
    # Hash map should be empty
    assert len(mock_pdf_hash_map) == 0

@pytest.mark.asyncio
async def test_upload_pdf_error_handling(client, mock_upload_dir, mock_pdf_hash_map):
    """Test error handling during PDF upload."""
    # Create a mock PDF file
    mock_pdf = io.BytesIO(b"%PDF-1.5\nTest PDF content")
    
    # Force an error by patching open() to raise an exception
    with patch("builtins.open", side_effect=IOError("Simulated IO error")):
        response = client.post(
            "/api/upload/pdf",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        
        assert response.status_code == 500
        assert "Error uploading file" in response.json()["detail"]
        
        # Hash map should be empty
        assert len(mock_pdf_hash_map) == 0

@pytest.mark.asyncio
async def test_list_pdfs_empty_directory(client, mock_upload_dir):
    """Test listing PDFs when the directory is empty."""
    response = client.get("/api/upload/list")
    
    assert response.status_code == 200
    result = response.json()
    
    assert result["success"] is True
    assert result["files"] == []

@pytest.mark.asyncio
async def test_list_pdfs_with_files(client, mock_upload_dir):
    """Test listing PDFs when files exist."""
    # Create some test PDF files
    test_files = ["file1.pdf", "file2.pdf", "file3.pdf"]
    
    for filename in test_files:
        file_path = mock_upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(b"%PDF-1.5\nTest content for " + filename.encode())
    
    # Add a non-PDF file (should be ignored)
    with open(mock_upload_dir / "not-a-pdf.txt", "wb") as f:
        f.write(b"This is not a PDF")
    
    response = client.get("/api/upload/list")
    
    assert response.status_code == 200
    result = response.json()
    
    assert result["success"] is True
    assert len(result["files"]) == 3
    
    # Check that all files are included
    file_ids = [file_info["fileId"] for file_info in result["files"]]
    assert set(file_ids) == set(test_files)
    
    # Check that each file entry has the expected fields
    for file_info in result["files"]:
        assert "fileId" in file_info
        assert "size" in file_info
        assert "uploadedAt" in file_info

@pytest.mark.asyncio
async def test_list_pdfs_error_handling(client, mock_upload_dir):
    """Test error handling when listing PDFs."""
    # Force an error by patching os.listdir to raise an exception
    with patch("os.listdir", side_effect=OSError("Simulated OS error")):
        response = client.get("/api/upload/list")
        
        assert response.status_code == 500
        assert "Error listing files" in response.json()["detail"]

@pytest.mark.asyncio
async def test_init_hash_map(mock_upload_dir, mock_pdf_hash_map):
    """Test hash map initialization."""
    # Create some test PDF files with known content
    test_files = {
        "file1.pdf": b"%PDF-1.5\nContent 1",
        "file2.pdf": b"%PDF-1.5\nContent 2",
    }
    
    # Create the files
    for filename, content in test_files.items():
        file_path = mock_upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(content)
    
    # Calculate expected MD5 hashes
    expected_hashes = {
        filename: hashlib.md5(content).hexdigest()
        for filename, content in test_files.items()
    }
    
    # Call the init_hash_map function
    from src.routes.upload_routes import init_hash_map
    init_hash_map()
    
    # Verify the hash map was populated correctly
    assert len(mock_pdf_hash_map) == 2
    
    for filename, hash_value in expected_hashes.items():
        assert hash_value in mock_pdf_hash_map
        assert mock_pdf_hash_map[hash_value] == filename 