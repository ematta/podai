"""
Integration tests for chat routes.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
import json
import asyncio
import sys
import os

# Add the parent directory to the path so we can import from conftest
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from conftest import MockLLMService

@pytest.mark.asyncio
async def test_chat_with_pdf(client):
    """Test chatting with a PDF document."""
    # Mock os.path.exists to return True
    with patch("os.path.exists", return_value=True):
        # Mock PDF service to avoid file access
        with patch("src.services.pdf_service.PDFService._extract_text_from_pdf", 
                  return_value=("Mocked PDF content", {"page_count": 5})):
            # Mock LLMService to return a fixed response
            with patch("src.services.llm_service.LLMService.generate_rag_response", 
                      return_value={"answer": "This is a mocked answer", "sources": []}):
                request_data = {
                    "fileId": "test-123.pdf",
                    "question": "What is the meaning of life?",
                    "history": []
                }

                # Make the request
                response = client.post("/api/chat/rag", json=request_data)

                # Check the response
                assert response.status_code == 200
                assert "answer" in response.json()
                assert response.json()["answer"] == "This is a mock answer to your document query about the document content."

@pytest.mark.asyncio
async def test_chat_missing_file(client):
    """Test chatting with a non-existent PDF."""
    # Mock os.path.exists to return False
    with patch("os.path.exists", return_value=False):
        request_data = {
            "fileId": "nonexistent.pdf",
            "question": "What is the meaning of life?",
            "history": []
        }

        response = client.post("/api/chat/rag", json=request_data)

        assert response.status_code == 404
        assert "detail" in response.json()
        assert "not found" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_chat_with_validation_error(client):
    """Test chat validation error handling."""
    # Missing required field (fileId)
    request_data = {
        "question": "What is the meaning of life?",
        "history": []
    }

    response = client.post("/api/chat/rag", json=request_data)

    # The actual implementation returns 400 for missing fileId
    assert response.status_code == 400
    assert "detail" in response.json()

@pytest.mark.asyncio
async def test_chat_with_server_error(client):
    """Test chat server error handling."""
    # Mock os.path.exists to return True
    with patch("os.path.exists", return_value=True):
        # Mock PDF service to avoid file access
        with patch("src.services.pdf_service.PDFService._extract_text_from_pdf",
                  return_value=("Mocked PDF content", {"page_count": 5})):
            # Mock process_document_query to raise an exception
            with patch("src.services.llm_service.LLMService.process_document_query",
                    side_effect=Exception("Test error")):
                request_data = {
                    "fileId": "test-123.pdf",
                    "question": "What is the meaning of life?",
                    "history": []
                }

                response = client.post("/api/chat/rag", json=request_data)

                assert response.status_code == 500

@pytest.mark.asyncio
async def test_chat_with_history(client):
    """Test chatting with a PDF with history."""
    # Mock os.path.exists to return True
    with patch("os.path.exists", return_value=True):
        # Mock PDF service to avoid file access
        with patch("src.services.pdf_service.PDFService._extract_text_from_pdf",
                  return_value=("Mocked PDF content", {"page_count": 5})):
            request_data = {
                "fileId": "test-123.pdf",
                "question": "What is the meaning of life?",
                "history": [
                    {"role": "user", "content": "Tell me about the document"},
                    {"role": "assistant", "content": "It's a document about life"}
                ]
            }

            # Make the request
            response = client.post("/api/chat/rag", json=request_data)

            # Check the response
            assert response.status_code == 200
            assert "answer" in response.json()
            assert response.json()["answer"] == "This is a mock answer to your document query about the document content."

@pytest.mark.asyncio
async def test_streaming_chat(client):
    """Test streaming chat."""
    # Mock os.path.exists to return True
    with patch("os.path.exists", return_value=True):
        # Mock PDF service to avoid file access
        with patch("src.services.pdf_service.PDFService._extract_text_from_pdf",
                  return_value=("Mocked PDF content", {"page_count": 5})):
            # Mock the document query response
            with patch("src.services.llm_service.LLMService.process_document_query",
                      return_value="This is a streaming response"):
                request_data = {
                    "fileId": "test-123.pdf",
                    "question": "What is streaming?",
                    "history": []
                }

                # Make the streaming request
                response = client.post("/api/chat/rag/stream", json=request_data)

                # Check the response status code
                assert response.status_code == 200

                # For streaming responses, we can't easily check the content
                # But we can verify it's a valid response
                content = ""
                for chunk in response.iter_text():
                    content += chunk
                
                assert content 