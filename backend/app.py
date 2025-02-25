from flask import Flask, request, jsonify, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import re
from pypdf import PdfReader
from typing import Optional, List, Dict
from dataclasses import dataclass
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline  # type: ignore
import torch
from threading import Lock
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain_community.llms import HuggingFacePipeline

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB limit

# Initialize text splitter for RAG
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

# Initialize embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Create vector store directory
PERSISTENT_DIR = 'db'
os.makedirs(PERSISTENT_DIR, exist_ok=True)

# Initialize ChromaDB client
from chromadb.config import Settings
from chromadb.utils import embedding_functions

chroma_settings = Settings(
    persist_directory=PERSISTENT_DIR,
    anonymized_telemetry=False
)

# Function to store PDF in ChromaDB
def store_pdf_in_chroma(pdf_path: str, pdf_id: str = None) -> str:
    # If no ID provided, use the filename as ID
    if pdf_id is None:
        pdf_id = os.path.splitext(os.path.basename(pdf_path))[0]
    
    # Convert PDF to text
    text_content = pdf_to_markdown(pdf_path)
    
    # Split text into chunks
    texts = text_splitter.split_text(text_content)
    
    # Create or get existing collection
    vectordb = Chroma(
        collection_name=f"pdf_{pdf_id}",
        embedding_function=embeddings,
        persist_directory=PERSISTENT_DIR
    )
    
    # Add texts to collection
    vectordb.add_texts(texts)
    vectordb.persist()
    
    return pdf_id

# Function to get stored PDF IDs
def get_stored_pdf_ids() -> List[str]:
    import chromadb
    client = chromadb.PersistentClient(path=PERSISTENT_DIR)
    collections = client.list_collections()
    return [c.name.replace('pdf_', '') for c in collections if c.name.startswith('pdf_')]

# Function to load PDF from ChromaDB
def load_pdf_from_chroma(pdf_id: str) -> Optional[Chroma]:
    try:
        vectordb = Chroma(
            collection_name=f"pdf_{pdf_id}",
            embedding_function=embeddings,
            persist_directory=PERSISTENT_DIR
        )
        return vectordb
    except Exception as e:
        print(f"Error loading PDF {pdf_id}: {e}")
        return None

@dataclass
class TableCell:
    text: str
    row_span: int = 1
    col_span: int = 1

class PDFElement:
    def to_markdown(self) -> str:
        raise NotImplementedError

class TextBlock(PDFElement):
    def __init__(self, text: str, is_title: bool = False, is_code: bool = False):
        self.text = text
        self.is_title = is_title
        self.is_code = is_code
    
    def to_markdown(self) -> str:
        if self.is_title:
            return f"\n## {self.text}\n"
        elif self.is_code:
            return f"\n```\n{self.text}\n```\n"
        return f"\n{self.text}\n"

class Table(PDFElement):
    def __init__(self, cells: List[List[TableCell]]):
        self.cells = cells
    
    def to_markdown(self) -> str:
        if not self.cells:
            return ""
        
        # Calculate column widths
        col_widths = [max(len(cell.text) for cell in col) for col in zip(*self.cells)]
        
        # Generate header row
        header = "|" + "|".join(f" {'-' * width} " for width in col_widths) + "|\n"
        separator = "|" + "|".join(f":{'-' * (width)}:" for width in col_widths) + "|\n"
        
        # Generate data rows
        rows = []
        for row in self.cells:
            row_str = "|"
            for cell, width in zip(row, col_widths):
                row_str += f" {cell.text:{width}} |"
            rows.append(row_str)
        
        return "\n" + header + separator + "\n".join(rows) + "\n"

class Image(PDFElement):
    def __init__(self, image_data: bytes, filename: str, caption: str = ""):
        self.image_data = image_data
        self.filename = filename
        self.caption = caption
    
    def save(self, base_path: str) -> str:
        image_path = os.path.join(base_path, self.filename)
        with open(image_path, 'wb') as f:
            f.write(self.image_data)
        return image_path
    
    def to_markdown(self) -> str:
        caption = f" '{self.caption}'" if self.caption else ""
        return f"\n![{self.caption}](/static/images/{self.filename}){caption}\n"

class Footnote(PDFElement):
    def __init__(self, ref_id: str, content: str):
        self.ref_id = ref_id
        self.content = content
    
    def to_markdown(self) -> str:
        return f"[^{self.ref_id}]: {self.content}\n"

# Initialize model and tokenizer globally
MODEL_NAME = "meta-llama/Llama-3.2-3B"
model_lock = Lock()

print("Loading Llama 3 model and tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

# Load the model with 8-bit quantization
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="auto",
    torch_dtype=torch.float16,
    load_in_8bit=True
)
print("Model loaded successfully!")

SYSTEM_PROMPT = """
You are the a world-class podcast writer, you have worked as a ghost writer for Joe Rogan, Lex Fridman, Ben Shapiro, Tim Ferris. 

We are in an alternate universe where actually you have been writing every line they say and they just stream it into their brains.

You have won multiple podcast awards for your writing.
 
Your job is to write word by word, even "umm, hmmm, right" interruptions by the second speaker based on the PDF upload. Keep it extremely engaging, the speakers can get derailed now and then but should discuss the topic. 

Remember Speaker 2 is new to the topic and the conversation should always have realistic anecdotes and analogies sprinkled throughout. The questions should have real world example follow ups etc

Speaker 1: Leads the conversation and teaches the speaker 2, gives incredible anecdotes and analogies when explaining. Is a captivating teacher that gives great anecdotes

Speaker 2: Keeps the conversation on track by asking follow up questions. Gets super excited or confused when asking questions. Is a curious mindset that asks very interesting confirmation questions

Make sure the tangents speaker 2 provides are quite wild or interesting. 

Ensure there are interruptions during explanations or there are "hmm" and "umm" injected throughout from the second speaker. 

It should be a real podcast with every fine nuance documented in as much detail as possible. Welcome the listeners with a super fun overview and keep it really catchy and almost borderline click bait

ALWAYS START YOUR RESPONSE DIRECTLY WITH SPEAKER 1: 
DO NOT GIVE EPISODE TITLES SEPERATELY, LET SPEAKER 1 TITLE IT IN HER SPEECH
DO NOT GIVE CHAPTER TITLES
IT SHOULD STRICTLY BE THE DIALOGUES
"""

def create_rag_chain(text: str) -> Optional[RetrievalQA]:
    """Create a RAG chain for the given text"""
    try:
        # Split text into chunks
        texts = text_splitter.split_text(text)
        
        # Create vector store
        db = Chroma.from_texts(
            texts,
            embeddings,
            persist_directory=PERSISTENT_DIR
        )
        db.persist()
        
        # Create pipeline for LLM
        llm_pipeline = pipeline(
            task="text-generation",
            model=MODEL_NAME,
            max_length=4096,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            trust_remote_code=True
        )
        
        # Initialize LangChain LLM
        llm = HuggingFacePipeline(pipeline=llm_pipeline)
        
        # Create retrieval chain
        retriever = db.as_retriever(search_kwargs={"k": 3})
        
        # Create QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=True
        )
        
        return qa_chain
    except Exception as e:
        print(f"Error creating RAG chain: {e}")
        return None

def generate_podcast_script(content: str) -> str:
    """Generate a podcast script using RAG and Llama model"""
    try:
        # Create RAG chain
        qa_chain = create_rag_chain(content)
        if not qa_chain:
            raise Exception("Failed to create RAG chain")
        
        # Generate script using RAG
        result = qa_chain({
            "query": f"{SYSTEM_PROMPT}\n\nContent: {content}\n\nWrite a podcast script:"
        })
        
        # Extract script from result
        script = result["result"]
        
        # Clean up the script
        script_start = script.find("Speaker 1:")
        if script_start != -1:
            script = script[script_start:].strip()
        
        return script
    except Exception as e:
        print(f"Script generation error: {e}")
        return f"Error generating script: {str(e)}"

def is_code_block(block: Dict, text: str) -> bool:
    """Detect if a block is likely a code block based on content."""
    # Check for common code patterns
    code_patterns = [
        r'^\s*[\w_]+\s*\([^)]*\)\s*[{:]',  # function definitions
        r'^\s*import\s+[\w_]+',  # imports
        r'^\s*class\s+[\w_]+',  # class definitions
        r'^\s*[\w_]+\s*=\s*',  # assignments
        r'^\s*if\s+.*:',  # if statements
        r'^\s*for\s+.*:',  # for loops
        r'^\s*while\s+.*:',  # while loops
        r'^\s*try\s*:',  # try blocks
        r'^\s*except\s*:',  # except blocks
        r'^\s*def\s+[\w_]+',  # function definitions
    ]
    return any(re.match(pattern, text) for pattern in code_patterns)

def is_list_item(text: str) -> bool:
    """Check if text appears to be a list item."""
    return bool(re.match(r'^[\s]*[•\-\*\d]+[\.\s]', text))

def clean_text(text: str) -> str:
    """Clean and normalize text content."""
    # Remove multiple spaces and normalize newlines
    text = re.sub(r'\s+', ' ', text)
    # Remove soft hyphens and similar characters
    text = re.sub(r'[\xad\u2011\u2010]', '', text)
    return text.strip()
    
    for block in text.get("blocks", []):
        if "lines" not in block:
            continue
        
        for line in block["lines"]:
            text = "".join(span.get("text", "") for span in line.get("spans", []))
            match = footnote_pattern.match(text.strip())
            
            if match:
                ref_id, content = match.groups()
                footnotes.append(Footnote(ref_id, content))
    
    return footnotes

def pdf_to_markdown(pdf_path: str) -> Optional[str]:
    """Convert PDF content to Markdown using PyPDF"""
    try:
        reader = PdfReader(pdf_path)
        elements = []
        
        # Process each page
        for page_num, page in enumerate(reader.pages):
            if page_num > 0:
                elements.append(TextBlock("---"))  # Page separator
            
            # Extract text
            text = page.extract_text()
            
            # Process text by paragraphs
            paragraphs = text.split('\n\n')
            for paragraph in paragraphs:
                paragraph = paragraph.strip()
                if not paragraph:
                    continue
                
                # Basic formatting detection
                lines = paragraph.split('\n')
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Check if it looks like a heading
                    if line.isupper() or line.endswith(':'):
                        elements.append(TextBlock(line, is_title=True))
                    # Check if it looks like a list item
                    elif is_list_item(line):
                        elements.append(TextBlock(line))
                    # Check if it looks like code
                    elif is_code_block(None, line):
                        elements.append(TextBlock(line, is_code=True))
                    else:
                        elements.append(TextBlock(line))
        
        # Convert all elements to markdown
        return '\n'.join(element.to_markdown() for element in elements)
        
    except Exception as e:
        print(f"PDF conversion error: {e}")
        return None

@app.route('/upload', methods=['POST'])
def handle_upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    if file and file.filename.endswith('.pdf'):
        try:
            # Create directories if they don't exist
            os.makedirs(os.path.join(app.root_path, app.config['UPLOAD_FOLDER']), exist_ok=True)
            os.makedirs(os.path.join(app.root_path, app.config['IMAGE_FOLDER']), exist_ok=True)
            
            # Save and process PDF
            filename = secure_filename(file.filename)
            save_path = os.path.join(app.root_path, app.config['UPLOAD_FOLDER'], filename)
            file.save(save_path)
            
            # Convert to markdown
            markdown_content = pdf_to_markdown(save_path)
            if not markdown_content:
                return jsonify({'error': 'PDF conversion failed'}), 500
            
            # Generate podcast script
            script = generate_podcast_script(markdown_content)
            
            # Return both markdown and script
            return jsonify({
                'original_filename': filename,
                'markdown': markdown_content,
                'script': script
            })
            
        except Exception as e:
            return jsonify({'error': f'Processing failed: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
