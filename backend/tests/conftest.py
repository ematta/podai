import pytest
import os
import sys
import tempfile
from flask import Flask
from io import BytesIO

# Add the backend directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import our app directly
import app as app_module

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    # Create a temporary instance of the app
    app = Flask(__name__)
    app.config.update({
        'TESTING': True,
        'UPLOAD_FOLDER': tempfile.mkdtemp(),
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB for testing, increased from 1MB
    })
    
    # Create necessary directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register the routes from our app_module
    for rule in app_module.app.url_map.iter_rules():
        endpoint = app_module.app.view_functions[rule.endpoint]
        # Skip the static endpoint as it's handled differently
        if rule.endpoint != 'static':
            app.add_url_rule(str(rule), view_func=endpoint, methods=rule.methods)
    
    yield app
    
    # Cleanup
    import shutil
    shutil.rmtree(app.config['UPLOAD_FOLDER'])

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def sample_pdf():
    """Create a minimal PDF file for testing."""
    # This is a minimal PDF file content
    pdf_content = b'%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<<>>>>endobj 4 0 obj<</Length 10>>stream\nBT /F1 12 Tf 100 700 Td (Test PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n0000000182 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n241\n%%EOF'
    return BytesIO(pdf_content)

@pytest.fixture
def mock_vector_store(mocker):
    """Mock ChromaDB vector store."""
    mock_vectordb = mocker.MagicMock()
    mock_vectordb.as_retriever.return_value = mocker.MagicMock()
    return mock_vectordb

@pytest.fixture
def mock_llm(mocker):
    """Mock LLM for testing."""
    mock_llm = mocker.MagicMock()
    mock_llm.return_value = "This is a mock response from the LLM."
    return mock_llm
