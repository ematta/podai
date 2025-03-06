"""
Common pytest fixtures for testing the PodAI backend.
"""
import pytest
import os
import asyncio
import sys
from unittest.mock import patch, MagicMock, PropertyMock
from collections import defaultdict

# Create mocks for problematic modules before they're imported
# This needs to happen before any imports that would load these modules
sys.modules['langchain.text_splitter'] = MagicMock()
sys.modules['langchain_text_splitters'] = MagicMock()
sys.modules['langchain_core'] = MagicMock()
sys.modules['langchain_core.documents'] = MagicMock()
sys.modules['langchain_core.callbacks'] = MagicMock()
sys.modules['langsmith'] = MagicMock()
sys.modules['langsmith.run_helpers'] = MagicMock()
sys.modules['langsmith.client'] = MagicMock()
sys.modules['langsmith.utils'] = MagicMock()
sys.modules['langsmith.schemas'] = MagicMock()

from src.services.pdf_service import PDFService

# Mock the LLMService class
class MockLLMService:
    """Mock LLM service for testing."""

    def __init__(self):
        """Initialize the mock LLM service."""
        pass

    async def process_pdf(self, file_path):
        """Mock process_pdf method."""
        return {
            "summary": "This is a mock summary of the PDF.",
            "key_points": ["Point 1", "Point 2", "Point 3"],
            "sentiment": "neutral"
        }

    async def chat_with_pdf(self, question, pdf_text, history=None):
        """Mock chat_with_pdf method."""
        return {
            "answer": "This is a mock answer to your question about the PDF.",
            "sources": [{"page": 1, "text": "Source text from page 1"}]
        }
        
    def process_document_query(self, question, document_text, history=None):
        """Mock process_document_query method - returns a string response."""
        return "This is a mock answer to your document query about the document content."

    async def stream_chat_with_pdf(self, question, pdf_text, history=None):
        """Mock stream_chat_with_pdf method."""
        async def mock_generator():
            chunks = ["This ", "is ", "a ", "mock ", "streaming ", "response."]
            for chunk in chunks:
                yield chunk
        
        return mock_generator()

    async def stream_rag_response(self, question, document_text, history=None):
        """Mock stream_rag_response method."""
        async def mock_generator():
            chunks = ["This ", "is ", "a ", "mock ", "streaming ", "RAG ", "response."]
            for chunk in chunks:
                yield chunk
        
        return mock_generator()
        
    async def generate_rag_response(self, question, document_text, history=None):
        """Mock generate_rag_response method."""
        return {
            "answer": "This is a mock RAG response.",
            "sources": [{"page": 1, "text": "Source text from page 1"}]
        }

# Now patch the LLMService with our mock
sys.modules['src.services.llm_service'] = MagicMock()
sys.modules['src.services.llm_service'].LLMService = MockLLMService

# Now we can import the FastAPI app
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Import the app after mocking the problematic modules
with patch('src.routes.chat_routes.LLMService', MockLLMService):
    from src.main import app
from src.models.database import Base

# Create a test client
@pytest.fixture
def client():
    """Create a test client for the application."""
    with TestClient(app) as test_client:
        yield test_client

# Event loop for async tests
@pytest.fixture
def event_loop():
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# In-memory SQLite database for testing
@pytest.fixture
async def async_test_engine():
    """Create an async SQLite engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest.fixture
async def async_test_session(async_test_engine):
    """Create an async session for database operations."""
    async_session = sessionmaker(
        async_test_engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session

# Mock upload directory
@pytest.fixture
def mock_upload_dir(tmp_path):
    """Create a temporary directory for file uploads during tests."""
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    
    # Patch the UPLOAD_FOLDER constant for testing
    with patch("src.routes.upload_routes.UPLOAD_FOLDER", str(upload_dir)):
        yield upload_dir

# Mock PDF hash map
@pytest.fixture
def mock_pdf_hash_map():
    """Create a mock PDF hash map for testing."""
    test_hash_map = {}
    
    with patch("src.routes.upload_routes.PDF_HASH_MAP", test_hash_map):
        yield test_hash_map 