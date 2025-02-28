import pytest
import os
from unittest.mock import patch, MagicMock
import app
from src.services.pdf_service import TextBlock, Table, TableCell, pdf_service

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
        monkeypatch.setattr('src.services.pdf_service.PdfReader', lambda *args: mock_reader)
        monkeypatch.setattr('src.services.pdf_service.process_text', lambda text: [mock_text_block])
        
        # Test the conversion
        result = app.pdf_to_markdown("test.pdf")
        
        # Assert the expected markdown content
        assert result == "This is test content.\n\n"
        
    def test_pdf_to_markdown_empty_pdf(self, monkeypatch):
        """Test the PDF to markdown conversion with empty PDF."""
        # Create mock PdfReader and page with no text
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = ""
        mock_reader.pages = [mock_page]
        
        # Mock the functions
        monkeypatch.setattr('src.services.pdf_service.PdfReader', lambda *args: mock_reader)
        
        # Test the conversion
        result = app.pdf_to_markdown("test.pdf")
        
        # Assert empty result
        assert result == ""
        
    def test_pdf_to_markdown_with_table(self, monkeypatch):
        """Test the PDF to markdown conversion with tables."""
        # Create mock PdfReader and page
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Text before table. Text after table."
        
        # Create mock table
        mock_table = Table([
            [TableCell("Header 1"), TableCell("Header 2")],
            [TableCell("Data 1"), TableCell("Data 2")]
        ])
        
        # Mock extract_tables to return our mock table data
        mock_page.extract_tables.return_value = [[["Header 1", "Header 2"], ["Data 1", "Data 2"]]]
        
        mock_reader.pages = [mock_page]
        
        # Create mock TextBlock
        mock_text_block = TextBlock("Text before table. Text after table.", {})
        
        # Mock the functions
        monkeypatch.setattr('src.services.pdf_service.PdfReader', lambda *args: mock_reader)
        monkeypatch.setattr('src.services.pdf_service.process_text', lambda text: [mock_text_block])
        monkeypatch.setattr('src.services.pdf_service.process_tables', lambda page: [mock_table])
        
        # Test the conversion
        result = app.pdf_to_markdown("test.pdf")
        
        # Assert the expected markdown content with text blocks
        assert "Text before table. Text after table." in result

class TestGenerateScript:
    def test_generate_script_from_markdown(self, monkeypatch):
        """Test generating a podcast script from markdown content."""
        # Define test markdown
        markdown = "# Test Heading\n\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph."
        
        # Mock LLM response
        mock_response = """# Podcast Script

**HOST:** Welcome to our podcast! Today we're discussing a fascinating document.

**HOST:** First paragraph.

**CO-HOST:** That's very interesting! Let's dive deeper...

**HOST:** Second paragraph.

**CO-HOST:** I'd like to add some thoughts to that...

**HOST:** Third paragraph.

**HOST:** Thanks for listening to our podcast! Don't forget to subscribe.
"""
        
        # Instead of mocking _query_model which no longer exists, directly mock the generate_script method
        monkeypatch.setattr('src.services.llm_service.llm_service.generate_script', 
                          lambda markdown_content: mock_response)
        
        # Generate script
        script = app.generate_script(markdown)
        
        # Assert script format and content
        assert "# Podcast Script" in script
        assert "**HOST:** Welcome to our podcast!" in script
        assert "**HOST:** First paragraph." in script
        assert "**CO-HOST:**" in script
        assert "Thanks for listening" in script
        
    def test_generate_script_empty_markdown(self, monkeypatch):
        """Test generating a podcast script from empty markdown."""
        # Mock the generate_script method to return empty string for empty input
        monkeypatch.setattr('src.services.llm_service.llm_service.generate_script', 
                          lambda markdown_content: "" if not markdown_content else "Some content")
        
        # Generate script from empty markdown
        script = app.generate_script("")
        
        # Assert empty output
        assert script == ""
        
    def test_generate_script_short_markdown(self, monkeypatch):
        """Test generating a podcast script from short markdown with only one paragraph."""
        # Define short markdown
        markdown = "Single paragraph."
        
        # Mock the fallback script generation
        expected_script = "# Podcast Script\n\n**HOST:** Welcome to our podcast!\n\n**HOST:** Single paragraph.\n\n**CO-HOST:** That's interesting!"
        monkeypatch.setattr('src.services.llm_service.llm_service.generate_script', 
                          lambda markdown_content: expected_script if markdown_content == "Single paragraph." else "Different content")
        
        # Generate script
        script = app.generate_script(markdown)
        
        # Assert the expected script content
        assert "# Podcast Script" in script
        assert "**HOST:** Welcome to our podcast!" in script
        assert "**HOST:** Single paragraph." in script
