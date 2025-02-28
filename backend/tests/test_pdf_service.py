import pytest
import os
from unittest.mock import patch, MagicMock
import app
from src.services.pdf_service import TextBlock, Table, TableCell

class TestPdfToMarkdown:
    def test_pdf_to_markdown_processing(self, monkeypatch):
        """Test the PDF to markdown conversion logic."""
        # Create mock PdfReader and page
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "This is test content."
        mock_reader.pages = [mock_page]
        
        # Create mock TextBlock
        mock_text_block = TextBlock("This is test content.", {})
        
        # Mock the functions
        monkeypatch.setattr('app.PdfReader', lambda file_path: mock_reader)
        monkeypatch.setattr('app.process_text', lambda text: [mock_text_block])
        
        # Test the conversion
        result = app.pdf_to_markdown("test.pdf")
        
        # Assert the expected markdown content
        assert result == "This is test content.\n\n"
        
    def test_pdf_to_markdown_empty_pdf(self, monkeypatch):
        """Test the PDF to markdown conversion with empty PDF."""
        # Create mock PdfReader and page
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = ""
        mock_reader.pages = [mock_page]
        
        # Mock the functions
        monkeypatch.setattr('app.PdfReader', lambda file_path: mock_reader)
        
        # Test the conversion
        result = app.pdf_to_markdown("test.pdf")
        
        # Assert the expected markdown content
        assert result == ""
        
    def test_pdf_to_markdown_error_handling(self, monkeypatch):
        """Test error handling in PDF to markdown conversion."""
        # Mock PdfReader to raise an exception
        def mock_pdf_reader(file_path):
            raise Exception("PDF processing error")
        
        monkeypatch.setattr('app.PdfReader', mock_pdf_reader)
        
        # Test the conversion
        result = app.pdf_to_markdown("test.pdf")
        
        # Assert the expected markdown content (empty due to error)
        assert result == ""


class TestGenerateScript:
    def test_generate_script_from_markdown(self):
        """Test generating a podcast script from markdown content."""
        # Define test markdown
        markdown = "# Test Heading\n\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph."
        
        # Generate script
        script = app.generate_script(markdown)
        
        # Assert script format and content
        assert "# Podcast Script" in script
        assert "**HOST:** Welcome to our podcast!" in script
        assert "**HOST:** First paragraph." in script
        assert "**CO-HOST:**" in script
        assert "Thanks for listening" in script
        
    def test_generate_script_empty_markdown(self):
        """Test generating a podcast script from empty markdown."""
        # Generate script from empty markdown
        script = app.generate_script("")
        
        # Assert empty output
        assert script == ""
        
    def test_generate_script_short_markdown(self):
        """Test generating a podcast script from short markdown with only one paragraph."""
        # Define short markdown
        markdown = "Single paragraph."
        
        # Generate script
        script = app.generate_script(markdown)
        
        # Assert script format and content
        assert "# Podcast Script" in script
        assert "**HOST:** Welcome to our podcast!" in script
        assert "**HOST:** Single paragraph." in script
        assert "Thanks for listening" in script
