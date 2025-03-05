import os
import time
import pypdf
from pathlib import Path
import tempfile
import shutil
import traceback
from typing import Dict, List, Any, Optional
# Import chromadb conditionally to avoid immediate errors
try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
import unstructured

from src.config.logger import setup_logger

class PDFService:
    def __init__(self):
        self.logger = setup_logger("pdf_service")
        self.upload_folder = os.getenv("UPLOAD_FOLDER", "uploads")
        
        # Default to disabled state
        self.chromadb_enabled = os.getenv("ENABLE_CHROMADB", "false").lower() == "true"
        self.chroma_host = os.getenv("CHROMA_HOST", "localhost")
        self.chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
        
        # Initialize everything as None
        self.collection = None
        self.chroma_client = None
        
        # Skip ChromaDB completely for now
        self.logger.info("ChromaDB integration is disabled for stability")

    def process_pdf(self, file_path: str, filename: str, original_filename: str) -> Dict[str, Any]:
        """
        Process a PDF file and store its contents
        """
        self.logger.info(f"Processing PDF file: {file_path}")
        
        try:
            # Extract text from PDF
            pdf_text, metadata = self._extract_text_from_pdf(file_path)
            
            # Create document ID without storing in ChromaDB
            doc_id = f"pdf_{int(time.time())}_{filename}"
            
            # Add metadata
            metadata.update({
                "filename": filename,
                "original_filename": original_filename,
                "file_path": file_path,
                "processed_at": time.time()
            })
            
            self.logger.info(f"PDF processed successfully: {filename}")
            
            return {
                "success": True,
                "document_id": doc_id,
                "metadata": metadata,
                "message": "Document processed successfully (vector storage disabled)"
            }
            
        except Exception as e:
            self.logger.error(f"Error processing PDF: {e}")
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }
    
    def _extract_text_from_pdf(self, file_path: str) -> tuple[str, Dict[str, Any]]:
        """
        Extract text and metadata from a PDF file
        """
        try:
            # Open the PDF
            with open(file_path, "rb") as file:
                try:
                    pdf_reader = pypdf.PdfReader(file)
                    
                    # Extract metadata
                    metadata = {
                        "page_count": len(pdf_reader.pages),
                        "title": pdf_reader.metadata.title if pdf_reader.metadata else None,
                        "author": pdf_reader.metadata.author if pdf_reader.metadata else None,
                        "subject": pdf_reader.metadata.subject if pdf_reader.metadata else None,
                        "creator": pdf_reader.metadata.creator if pdf_reader.metadata else None,
                        "producer": pdf_reader.metadata.producer if pdf_reader.metadata else None,
                    }
                    
                    # Extract text from all pages
                    text = ""
                    for page_num, page in enumerate(pdf_reader.pages):
                        try:
                            page_text = page.extract_text()
                            if page_text:
                                text += f"\n\n--- Page {page_num + 1} ---\n\n" + page_text
                        except Exception as e:
                            self.logger.error(f"Error extracting text from page {page_num}: {e}")
                    
                    if not text:
                        self.logger.warning("No text extracted from PDF")
                        text = "No readable text found in document"
                        
                    return text, metadata
                except pypdf.errors.PdfStreamError as e:
                    self.logger.error(f"Error extracting text from PDF: {e}")
                    # Return minimal metadata for invalid PDFs
                    return "Invalid or corrupt PDF file", {
                        "page_count": 0,
                        "error": str(e),
                        "valid_pdf": False
                    }
                
        except Exception as e:
            self.logger.error(f"Error extracting text from PDF: {e}")
            raise
    
    def get_pdf_info(self, file_path: str) -> Dict[str, Any]:
        """
        Get information about a PDF file
        """
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Get file stats
            stats = os.stat(file_path)
            file_info = {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "file_size": stats.st_size,
                "created_at": stats.st_ctime,
                "modified_at": stats.st_mtime
            }
            
            # Extract metadata
            _, metadata = self._extract_text_from_pdf(file_path)
            file_info.update(metadata)
            
            return file_info
            
        except Exception as e:
            self.logger.error(f"Error getting PDF info: {e}")
            traceback.print_exc()
            raise 