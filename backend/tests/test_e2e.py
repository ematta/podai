import pytest
import os
import json
import re
from pathlib import Path
import sys

class TestEndToEndPdfConversion:
    def test_pdf_to_markdown_e2e(self, client):
        """
        End-to-end test that verifies the PDF to markdown conversion using
        an actual research paper PDF (2412.14135v1.pdf).
        """
        # Path to the test PDF file
        test_dir = Path(__file__).parent
        pdf_path = test_dir / '2412.14135v1.pdf'
        
        # Verify that the test file exists
        assert pdf_path.exists(), f"Test PDF file not found at {pdf_path}"
        
        # Get PDF file size
        pdf_size = pdf_path.stat().st_size
        pdf_size_mb = pdf_size / (1024 * 1024)
        print(f"\nTest PDF file size: {pdf_size_mb:.2f} MB")
        
        # Open and read the PDF file
        with open(pdf_path, 'rb') as pdf_file:
            try:
                # Send the PDF to the conversion endpoint
                response = client.post(
                    '/pdf-to-markdown',
                    data={
                        'file': (pdf_file, '2412.14135v1.pdf')
                    },
                    content_type='multipart/form-data',
                    # Allow following redirects
                    follow_redirects=True
                )
                
                # Print detailed response info for debugging
                print(f"Response status code: {response.status_code}")
                print(f"Response headers: {dict(response.headers)}")
                
                # Check if we got a "Payload Too Large" error
                if response.status_code == 413:
                    print("ERROR: Request entity too large - check MAX_CONTENT_LENGTH in the conftest.py")
                    assert False, "Payload Too Large error: PDF file exceeds size limit"
                
                # Verify successful response
                assert response.status_code == 200, f"API returned status code {response.status_code} with response: {response.data.decode('utf-8')}"
                
                data = json.loads(response.data)
                assert 'markdown' in data, f"Response doesn't contain 'markdown' field. Got: {data}"
                
                markdown = data['markdown']
                
                # Verify that the markdown is not empty
                assert markdown.strip(), "Markdown result is empty"
                
                # Print the first 200 characters of markdown for debugging
                print(f"First 200 chars of markdown: {markdown[:200]}")
                
                # Verify that the markdown contains typical research paper sections
                # Check for common sections or keywords that should be in a research paper
                expected_elements = [
                    # Common paper components
                    r'abstract', r'introduction', r'conclusion',
                    # Check for mathematical notation
                    r'\d+\.\d+',  # Look for numbers like 1.2, 3.4, etc.
                    # Check for paragraphs - a reasonable paper should have several paragraphs
                    r'\n\n',
                ]
                
                # Count the number of matched elements
                match_count = 0
                for pattern in expected_elements:
                    if re.search(pattern, markdown, re.IGNORECASE):
                        match_count += 1
                        print(f"Found pattern: {pattern}")
                
                # Check word count - a typical research paper should convert to substantial text
                word_count = len(re.findall(r'\b\w+\b', markdown))
                
                # Log insights about the markdown output
                print(f"Markdown length: {len(markdown)} characters")
                print(f"Word count: {word_count} words")
                print(f"Matched {match_count} out of {len(expected_elements)} expected elements")
                
                # Verify that the markdown has a reasonable amount of content
                assert word_count > 100, f"Markdown has only {word_count} words, expected more than 100"
                
                # Verify that some of the expected elements are found
                assert match_count >= 2, f"Only found {match_count} expected elements in the markdown"
                
            except Exception as e:
                print(f"Test failed with exception: {str(e)}")
                import traceback
                traceback.print_exc()
                raise
    
    def test_upload_pdf_e2e(self, client):
        """
        End-to-end test that verifies the full PDF upload and processing,
        checking both the markdown and script generation.
        """
        # Path to the test PDF file
        test_dir = Path(__file__).parent
        pdf_path = test_dir / '2412.14135v1.pdf'
        
        # Verify that the test file exists
        assert pdf_path.exists(), f"Test PDF file not found at {pdf_path}"
        
        # Get PDF file size
        pdf_size = pdf_path.stat().st_size
        pdf_size_mb = pdf_size / (1024 * 1024)
        print(f"\nTest PDF file size: {pdf_size_mb:.2f} MB")
        
        # Open and read the PDF file
        with open(pdf_path, 'rb') as pdf_file:
            try:
                # Send the PDF to the upload endpoint
                response = client.post(
                    '/upload',
                    data={
                        'file': (pdf_file, '2412.14135v1.pdf')
                    },
                    content_type='multipart/form-data',
                    follow_redirects=True
                )
                
                # Print detailed response info for debugging
                print(f"Response status code: {response.status_code}")
                print(f"Response headers: {dict(response.headers)}")
                
                # Check if we got a "Payload Too Large" error
                if response.status_code == 413:
                    print("ERROR: Request entity too large - check MAX_CONTENT_LENGTH in the conftest.py")
                    assert False, "Payload Too Large error: PDF file exceeds size limit"
                
                # Verify successful response
                assert response.status_code == 200, f"API returned status code {response.status_code} with response: {response.data.decode('utf-8')}"
                
                data = json.loads(response.data)
                assert 'markdown' in data, f"Response doesn't contain 'markdown' field. Got: {data}"
                assert 'script' in data, f"Response doesn't contain 'script' field. Got: {data}"
                assert 'pdf_id' in data, f"Response doesn't contain 'pdf_id' field. Got: {data}"
                
                markdown = data['markdown']
                script = data['script']
                
                # Verify that the markdown is not empty
                assert markdown.strip(), "Markdown result is empty"
                
                # Verify that the script is not empty
                assert script.strip(), "Script result is empty"
                
                # Verify that the script contains podcast-specific content
                assert "HOST:" in script, "Script doesn't contain host dialogue"
                
                # Check word count for markdown
                markdown_word_count = len(re.findall(r'\b\w+\b', markdown))
                assert markdown_word_count > 100, f"Markdown has only {markdown_word_count} words, expected more than 100"
                
                # Check word count for script
                script_word_count = len(re.findall(r'\b\w+\b', script))
                assert script_word_count > 50, f"Script has only {script_word_count} words, expected more than 50"
                
            except Exception as e:
                print(f"Test failed with exception: {str(e)}")
                import traceback
                traceback.print_exc()
                raise
