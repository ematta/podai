import pytest
import os
import json
from io import BytesIO
from unittest.mock import patch, MagicMock

class TestUploadRoute:
    def test_upload_success(self, client, sample_pdf, monkeypatch):
        """Test successful PDF upload."""
        # Mock the PDF processing functions
        def mock_pdf_to_markdown(file_path):
            return "# Test PDF\nThis is a test PDF content."
        
        def mock_generate_script(markdown_content):
            return "# Podcast Script\n\n**HOST:** Welcome to our test podcast!"
        
        def mock_save(self, dst, buffer_size=16384):
            return None
            
        def mock_uuid4():
            mock = MagicMock()
            mock.__str__.return_value = "test-pdf-id-123"
            return mock
        
        # Apply the patches
        monkeypatch.setattr('app.pdf_to_markdown', mock_pdf_to_markdown)
        monkeypatch.setattr('app.generate_script', mock_generate_script)
        monkeypatch.setattr('uuid.uuid4', mock_uuid4)
        monkeypatch.setattr('werkzeug.datastructures.file_storage.FileStorage.save', mock_save)
        
        # Test file upload
        sample_pdf.seek(0)
        response = client.post(
            '/upload',
            data={
                'file': (sample_pdf, 'test.pdf')
            },
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'pdf_id' in data
        assert 'markdown' in data
        assert 'script' in data
        assert data['markdown'] == "# Test PDF\nThis is a test PDF content."
        assert data['script'] == "# Podcast Script\n\n**HOST:** Welcome to our test podcast!"
    
    def test_upload_no_file(self, client):
        """Test upload with no file."""
        response = client.post('/upload', content_type='multipart/form-data')
        assert response.status_code == 400
        
    def test_upload_invalid_file_type(self, client):
        """Test upload with non-PDF file."""
        response = client.post(
            '/upload',
            data={
                'file': (BytesIO(b'Not a PDF'), 'test.txt')
            },
            content_type='multipart/form-data'
        )
        assert response.status_code == 400

class TestPdfToMarkdownRoute:
    def test_pdf_to_markdown_success(self, client, sample_pdf, monkeypatch):
        """Test successful PDF to markdown conversion."""
        def mock_pdf_to_markdown(file_path):
            return "# Test PDF\nThis is a test PDF content."
        
        def mock_save(self, dst, buffer_size=16384):
            return None
            
        def mock_uuid4():
            mock = MagicMock()
            mock.__str__.return_value = "test-pdf-id-123"
            return mock
        
        monkeypatch.setattr('app.pdf_to_markdown', mock_pdf_to_markdown)
        monkeypatch.setattr('uuid.uuid4', mock_uuid4)
        monkeypatch.setattr('werkzeug.datastructures.file_storage.FileStorage.save', mock_save)
        
        sample_pdf.seek(0)
        response = client.post(
            '/pdf-to-markdown',
            data={
                'file': (sample_pdf, 'test.pdf')
            },
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'markdown' in data
        assert data['markdown'] == "# Test PDF\nThis is a test PDF content."
    
    def test_pdf_to_markdown_no_file(self, client):
        """Test PDF to markdown with no file."""
        response = client.post('/pdf-to-markdown', content_type='multipart/form-data')
        assert response.status_code == 400
    
    def test_pdf_to_markdown_invalid_file_type(self, client):
        """Test PDF to markdown with non-PDF file."""
        response = client.post(
            '/pdf-to-markdown',
            data={
                'file': (BytesIO(b'Not a PDF'), 'test.txt')
            },
            content_type='multipart/form-data'
        )
        assert response.status_code == 400

class TestChatRoute:
    def test_chat_success(self, client, monkeypatch):
        """Test successful chat with PDF."""
        pdf_id = 'test_pdf_id'
        
        # Mock os.path.exists to make it think the PDF exists
        def mock_exists(path):
            return True
        
        # Mock the pdf_service and llm_service
        def mock_pdf_reader(*args):
            mock_reader = MagicMock()
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "This is sample PDF content for testing."
            mock_reader.pages = [mock_page]
            return mock_reader
        
        # Mock the chat response with the correct structure
        def mock_chat_with_pdf(question, pdf_text):
            return f"This is a response to: {question}"
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        monkeypatch.setattr('src.services.pdf_service.pdf_service.PdfReader', mock_pdf_reader)
        monkeypatch.setattr('src.services.llm_service.llm_service.chat_with_pdf', mock_chat_with_pdf)
        
        # Test chat request
        response = client.post(
            f'/chat/{pdf_id}',
            json={'question': 'What is in this PDF?'},
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'response' in data
        assert data['response'] == "This is a response to: What is in this PDF?"
    
    def test_chat_pdf_not_found(self, client, monkeypatch):
        """Test chat with non-existent PDF."""
        pdf_id = 'nonexistent_pdf_id'
        
        # Mock os.path.exists to make it think the PDF doesn't exist
        def mock_exists(path):
            return False
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        
        # Test chat request
        response = client.post(
            f'/chat/{pdf_id}',
            json={'question': 'What is in this PDF?'},
            content_type='application/json'
        )
        
        assert response.status_code == 404
    
    def test_chat_missing_question(self, client, monkeypatch):
        """Test chat without question parameter."""
        pdf_id = 'test_pdf_id'
        
        # Mock os.path.exists to make it think the PDF exists
        def mock_exists(path):
            return True
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        
        # Test chat request without question
        response = client.post(
            f'/chat/{pdf_id}',
            json={},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'question' in data['error'].lower()

class TestListPDFsRoute:
    def test_list_pdfs_success(self, client, monkeypatch):
        """Test successful listing of PDFs."""
        # Mock os.path.exists and os.listdir
        def mock_exists(path):
            return True
        
        def mock_listdir(path):
            return ['test_pdf1.pdf', 'test_pdf2.pdf', 'not_a_pdf.txt']
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        monkeypatch.setattr('os.listdir', mock_listdir)
        
        # Test list PDFs request
        response = client.get('/pdfs')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'pdf_ids' in data
        assert len(data['pdf_ids']) == 2
        assert 'test_pdf1' in data['pdf_ids']
        assert 'test_pdf2' in data['pdf_ids']
        assert 'not_a_pdf' not in data['pdf_ids']
    
    def test_list_pdfs_empty(self, client, monkeypatch):
        """Test listing PDFs when directory is empty."""
        # Mock os.path.exists and os.listdir
        def mock_exists(path):
            return True
        
        def mock_listdir(path):
            return []
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        monkeypatch.setattr('os.listdir', mock_listdir)
        
        # Test list PDFs request
        response = client.get('/pdfs')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'pdf_ids' in data
        assert len(data['pdf_ids']) == 0
