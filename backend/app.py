from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import re
import fitz  # PyMuPDF
from typing import Optional
from transformers import AutoTokenizer, AutoModelForCausalLM  # type: ignore
import torch
from threading import Lock

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# Initialize model and tokenizer globally
MODEL_NAME = "meta-llama/Llama-3.2-3B"
model_lock = Lock()

print("Loading Llama 3 model and tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

# Load the model with basic configuration
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="auto",
    torch_dtype=torch.float16,
    use_flash_attention_2=True
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

def generate_podcast_script(content: str) -> str:
    """Generate a podcast script using Llama 3"""
    try:
        with model_lock:
            # Prepare the prompt
            full_prompt = f"{SYSTEM_PROMPT}\n\nContent: {content}\n\nScript:"
            
            # Tokenize and generate
            inputs = tokenizer(full_prompt, return_tensors="pt").to(model.device)
            outputs = model.generate(
                inputs["input_ids"],
                max_length=4096,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
            
            # Decode and return the generated script
            generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
            # Extract only the generated script part
            script_start = generated_text.find("Script:")
            if script_start != -1:
                return generated_text[script_start + 7:].strip()
            return generated_text.strip()
    except Exception as e:
        print(f"Script generation error: {e}")
        return f"Error generating script: {str(e)}"

def is_title(block, avg_font_size: float) -> bool:
    """Determine if a block is likely a title based on font size and style."""
    font_size = block[5]  # font size
    font_flags = block[8]  # font flags (bold, italic, etc.)
    return font_size > avg_font_size * 1.3 or font_flags & 16  # Check if bold or larger than average

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

def pdf_to_markdown(pdf_path: str) -> Optional[str]:
    """Convert PDF content to Markdown with enhanced formatting using PyMuPDF"""
    try:
        doc = fitz.open(pdf_path)
        markdown_content = []
        
        # First pass: calculate average font size
        font_sizes = []
        for page in doc:
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            if span["size"] > 0:  # Ignore invalid sizes
                                font_sizes.append(span["size"])
        
        avg_font_size = sum(font_sizes) / len(font_sizes) if font_sizes else 12
        
        # Second pass: convert to markdown
        current_list_level = 0
        for page_num, page in enumerate(doc):
            if page_num > 0:
                markdown_content.append("\n---\n")  # Page separator
            
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" not in block:
                    continue
                
                block_text = ""
                current_style = None
                
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = clean_text(span["text"])
                        if not text:
                            continue
                        
                        # Handle font styles
                        if span["flags"] & 16:  # Bold
                            text = f"**{text}**"
                        elif span["flags"] & 1:  # Italic
                            text = f"*{text}*"
                        
                        block_text += text + " "
                
                block_text = block_text.strip()
                if not block_text:
                    continue
                
                # Determine block type and format accordingly
                if is_title(block, avg_font_size):
                    markdown_content.append(f"\n## {block_text}\n")
                elif is_list_item(block_text):
                    # Preserve list formatting
                    markdown_content.append(block_text)
                else:
                    # Regular paragraph
                    markdown_content.append(f"\n{block_text}\n")
        
        doc.close()
        return '\n'.join(markdown_content)
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
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(save_path)
        
        markdown_content = pdf_to_markdown(save_path)
        if not markdown_content:
            return jsonify({'error': 'PDF conversion failed'}), 500
        
        script = generate_podcast_script(markdown_content)
        return jsonify({
            'original_filename': filename,
            'script': script
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
