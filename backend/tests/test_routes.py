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
        
        # Apply the patches
        monkeypatch.setattr('app.pdf_to_markdown', mock_pdf_to_markdown)
        monkeypatch.setattr('app.generate_script', mock_generate_script)
        
        # Test file upload
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
        response = client.post('/upload', data={})
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'No file part'
    
    def test_upload_invalid_file_type(self, client):
        """Test upload with non-PDF file."""
        response = client.post(
            '/upload',
            data={
                'file': (BytesIO(b'not a pdf'), 'test.txt')
            },
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'Only PDF files are allowed'


class TestPdfToMarkdownRoute:
    def test_pdf_to_markdown_success(self, client, sample_pdf, monkeypatch):
        """Test successful PDF to markdown conversion."""
        # Mock the PDF processing function
        def mock_pdf_to_markdown(file_path):
            return "# Test PDF\nThis is a test PDF content."
        
        # Apply the patch
        monkeypatch.setattr('app.pdf_to_markdown', mock_pdf_to_markdown)
        
        # Test file upload
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
        response = client.post('/pdf-to-markdown', data={})
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'No file part'
    
    def test_pdf_to_markdown_invalid_file_type(self, client):
        """Test PDF to markdown with non-PDF file."""
        response = client.post(
            '/pdf-to-markdown',
            data={
                'file': (BytesIO(b'not a pdf'), 'test.txt')
            },
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'Only PDF files are allowed'


class TestChatRoute:
    def test_chat_success(self, client, monkeypatch):
        """Test successful chat with PDF."""
        pdf_id = 'test_pdf_id'
        
        # Mock os.path.exists to make it think the PDF exists
        def mock_exists(path):
            return True
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        
        # Test chat request
        response = client.post(
            f'/chat/{pdf_id}',
            json={'question': 'What is in this PDF?'},
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'answer' in data
        assert 'sources' in data
    
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
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'PDF not found'
    
    def test_chat_missing_question(self, client, monkeypatch):
        """Test chat without question parameter."""
        pdf_id = 'test_pdf_id'
        
        # Mock os.path.exists to make it think the PDF exists
        def mock_exists(path):
            return True
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        
        # Test chat request with empty body
        response = client.post(
            f'/chat/{pdf_id}',
            json={},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'No question provided'


class TestListPDFsRoute:
    def test_list_pdfs_success(self, client, monkeypatch):
        """Test successful listing of PDFs."""
        # Mock os.path.exists and os.listdir
        def mock_exists(path):
            return True
        
        def mock_listdir(path):
            return ['file1.pdf', 'file2.pdf', 'notapdf.txt']
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        monkeypatch.setattr('os.listdir', mock_listdir)
        
        # Test listing PDFs
        response = client.get('/pdfs')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'pdf_ids' in data
        assert set(data['pdf_ids']) == {'file1', 'file2'}
    
    def test_list_pdfs_empty(self, client, monkeypatch):
        """Test listing PDFs when directory is empty."""
        # Mock os.path.exists and os.listdir
        def mock_exists(path):
            return True
        
        def mock_listdir(path):
            return []
        
        monkeypatch.setattr('os.path.exists', mock_exists)
        monkeypatch.setattr('os.listdir', mock_listdir)
        
        # Test listing PDFs
        response = client.get('/pdfs')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'pdf_ids' in data
        assert data['pdf_ids'] == []
