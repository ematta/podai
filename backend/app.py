from flask import (
    Flask, request, jsonify, send_file, render_template, 
    send_from_directory
)
from flask_cors import CORS
import os
import uuid
import logging
from werkzeug.utils import secure_filename
from src.services.pdf_service import pdf_service
from src.services.llm_service import llm_service
from src.config.settings import settings

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure app settings
app.config['UPLOAD_FOLDER'] = settings.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = settings.MAX_UPLOAD_SIZE  # Use the 16MB limit from settings.py
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Store chat history in memory (consider using a database for production)
chat_history = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def pdf_to_markdown(file_path):
    """Convert PDF to markdown format"""
    try:
        logger.debug(f"Opening PDF: {file_path}")
        reader = pdf_service.PdfReader(file_path)
        logger.debug(f"PDF opened successfully with {len(reader.pages)} pages")
        
        markdown_content = ""
        
        for page_num, page in enumerate(reader.pages):
            logger.debug(f"Processing page {page_num+1}/{len(reader.pages)}")
            text = page.extract_text()
            if text:
                elements = pdf_service.process_text(text)
                for element in elements:
                    markdown_content += element.to_markdown() + "\n\n"
                
        logger.debug(f"PDF processing complete - generated {len(markdown_content)} characters of markdown")
        return markdown_content
    except Exception as e:
        logger.error(f"Error converting PDF to markdown: {str(e)}")
        import traceback
        traceback.print_exc()
        return ""

def generate_script(markdown_content):
    """
    Generate a podcast script from markdown content using Llama 3.2 3B
    """
    return llm_service.generate_script(markdown_content)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF files are allowed'}), 400
    
    try:
        # Create unique ID and save file
        pdf_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{pdf_id}.pdf")
        
        file.save(file_path)
        
        # Convert PDF to markdown
        markdown = pdf_to_markdown(file_path)
        
        # Generate script from markdown
        script = generate_script(markdown)
        
        # Initialize chat history for this PDF
        chat_history[pdf_id] = []
        
        return jsonify({
            'pdf_id': pdf_id,
            'original_filename': filename,
            'markdown': markdown,
            'script': script
        })
    
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/pdf-to-markdown', methods=['POST'])
def convert_pdf_to_markdown():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF files are allowed'}), 400
    
    # Create temp file path
    temp_id = str(uuid.uuid4())
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{temp_id}.pdf")
    
    try:
        # Print some debug info
        logger.debug(f"Processing PDF: {file.filename}, size: {os.fstat(file.fileno()).st_size / (1024 * 1024):.2f} MB")
        
        # Save the file
        file.save(file_path)
        logger.debug(f"File saved to {file_path}")
        
        # Convert PDF to markdown
        markdown = pdf_to_markdown(file_path)
        logger.debug(f"Markdown conversion complete, length: {len(markdown)} characters")
        
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"Temp file removed: {file_path}")
        
        return jsonify({'markdown': markdown})
    
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        # Clean up temp file if it exists
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"Temp file removed after error: {file_path}")
        return jsonify({'error': str(e)}), 500

@app.route('/pdfs', methods=['GET'])
def get_pdfs():
    """Return list of stored PDF IDs"""
    pdf_files = []
    upload_dir = app.config['UPLOAD_FOLDER']
    
    if os.path.exists(upload_dir):
        for file in os.listdir(upload_dir):
            if file.endswith('.pdf'):
                pdf_id = file.split('.')[0]
                pdf_files.append(pdf_id)
    
    return jsonify({'pdf_ids': pdf_files})

@app.route('/pdf/<pdf_id>', methods=['GET'])
def get_pdf(pdf_id):
    """Serve a specific PDF file"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], f"{pdf_id}.pdf")

@app.route('/chat/<pdf_id>', methods=['POST'])
def chat_with_pdf(pdf_id):
    """Handle chat interactions with a specific PDF"""
    data = request.json
    if not data or 'question' not in data:
        return jsonify({'error': 'No question provided'}), 400
    
    question = data['question']
    
    # Check if PDF exists
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{pdf_id}.pdf")
    if not os.path.exists(file_path):
        return jsonify({'error': 'PDF not found'}), 404
    
    # Store question in chat history
    if pdf_id not in chat_history:
        chat_history[pdf_id] = []
    
    chat_history[pdf_id].append({'role': 'user', 'content': question})
    
    try:
        # Extract text from PDF
        reader = pdf_service.PdfReader(file_path)
        pdf_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pdf_text += text + "\n\n"
        
        # Use LLM to generate response
        answer = llm_service.chat_with_pdf(question, pdf_text)
        sources = [f"Page {i+1}" for i in range(min(3, len(pdf_text) // 1000))]
        
        # Store answer in chat history
        chat_history[pdf_id].append({'role': 'assistant', 'content': answer, 'sources': sources})
        
        return jsonify({'response': answer, 'sources': sources})
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/debug/llm')
def debug_llm():
    """Debug endpoint to check LLM status"""
    try:
        # Basic information
        debug_info = {
            "llm_model": settings.LLM_MODEL,
            "has_api_token": bool(settings.HUGGINGFACE_API_TOKEN),
            "api_token_length": len(settings.HUGGINGFACE_API_TOKEN) if settings.HUGGINGFACE_API_TOKEN else 0,
            "temperature": settings.LLM_TEMPERATURE,
            "max_length": settings.LLM_MAX_LENGTH
        }
        
        # Test a simple prompt if token is available
        if settings.HUGGINGFACE_API_TOKEN:
            try:
                test_result = llm_service.llm.invoke("Say hello world!")
                debug_info["test_result"] = "Success"
                debug_info["test_output"] = test_result[:100] + "..." if len(test_result) > 100 else test_result
            except Exception as e:
                debug_info["test_result"] = "Failed"
                debug_info["test_error"] = str(e)
        
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8081, debug=True)