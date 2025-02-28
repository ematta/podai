import pytest
import os
import json
import re
from pathlib import Path
import sys
from unittest.mock import MagicMock

"""
End-to-end tests are commented out because they require actual PDF files
and depend on the real LLM implementation.

To run these tests, you need:
1. A valid PDF file named '2412.14135v1.pdf' in the tests directory
2. The actual LLM implementation running with the Hugging Face API
"""

# Instead of actual E2E tests, we'll use mocked ones for CI purposes
class TestMockedE2E:
    def test_mocked_pdf_workflow(self, client, sample_pdf, monkeypatch):
        """Test the complete workflow with mocked responses"""
        # Mock functions that interact with the file system and external services
        def mock_save(self, dst, buffer_size=16384):
            return None
        
        def mock_pdf_to_markdown(file_path):
            return "# Test PDF\nThis is a test PDF content.\n\nIt has multiple paragraphs."
        
        def mock_generate_script(markdown_content):
            return "# Podcast Script\n\n**HOST:** Welcome to our podcast!\n\n**HOST:** This is a test PDF content.\n\n**CO-HOST:** That's interesting!\n\n**HOST:** Thanks for listening!"
        
        def mock_chat_with_pdf(question, pdf_text):
            return f"Here's an answer to: {question}"
            
        # Mock UUID to have a predictable ID
        def mock_uuid4():
            mock = MagicMock()
            mock.__str__.return_value = "test-pdf-id-123"
            return mock
        
        # Mock PdfReader
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "This is a test PDF content."
        mock_reader.pages = [mock_page]
        
        # Apply mocks
        monkeypatch.setattr('app.pdf_to_markdown', mock_pdf_to_markdown)
        monkeypatch.setattr('app.generate_script', mock_generate_script)
        monkeypatch.setattr('src.services.llm_service.llm_service.chat_with_pdf', mock_chat_with_pdf)
        monkeypatch.setattr('os.path.exists', lambda path: True)
        monkeypatch.setattr('uuid.uuid4', mock_uuid4)
        monkeypatch.setattr('werkzeug.datastructures.file_storage.FileStorage.save', mock_save)
        monkeypatch.setattr('src.services.pdf_service.PdfReader', lambda *args: mock_reader)
        
        # Step 1: Upload PDF
        # Make sure sample_pdf is at the beginning position for reading
        sample_pdf.seek(0)
        upload_response = client.post(
            '/upload',
            data={'file': (sample_pdf, 'test.pdf')},
            content_type='multipart/form-data'
        )
            
        assert upload_response.status_code == 200
        upload_data = json.loads(upload_response.data)
        pdf_id = upload_data['pdf_id']
        
        # Step 2: Chat with PDF
        chat_response = client.post(
            f'/chat/{pdf_id}',
            json={'question': 'What is this PDF about?'},
            content_type='application/json'
        )
        
        assert chat_response.status_code == 200
        chat_data = json.loads(chat_response.data)
        assert 'response' in chat_data
        
        # Step 3: List PDFs
        list_response = client.get('/pdfs')
        assert list_response.status_code == 200
        list_data = json.loads(list_response.data)
        assert 'pdf_ids' in list_data
