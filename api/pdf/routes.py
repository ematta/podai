from fastapi import APIRouter, File, UploadFile
import shutil
import os
import tempfile
import pymupdf4llm

router = APIRouter()

# Define a directory to store uploaded PDFs
# In a real application, you might want to use a more robust storage solution
PDF_UPLOAD_DIR = "uploaded_pdfs"
os.makedirs(PDF_UPLOAD_DIR, exist_ok=True)

@router.post("/upload", tags=["pdf"])
async def upload_pdf_endpoint(file: UploadFile = File(...)):
    # For now, we just accept the file and save it.
    # You can add more sophisticated PDF processing logic here later.
    if not file.filename:
        return {"error": "No filename provided for uploaded file."}
    file_location = os.path.join(PDF_UPLOAD_DIR, file.filename)
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"info": f"File '{file.filename}' saved at '{file_location}'"}
    except Exception as e:
        return {"error": str(e), "filename": file.filename}
    finally:
        # Ensure the uploaded file is closed
        if hasattr(file, 'file') and hasattr(file.file, 'close'):
            file.file.close()

@router.post("/parse", tags=["pdf"])
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    if not file.filename:
        return {"error": "No filename provided for uploaded file."}

    try:
        # Read the file content
        file_content = await file.read()
        
        # Save to a temporary file since pymupdf4llm needs a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Use pymupdf4llm to convert PDF to Markdown
            markdown_content = pymupdf4llm.to_markdown(temp_file_path)
            
            return {"filename": file.filename, "content_markdown": markdown_content}
        except Exception as e:
            return {"error": str(e), "filename": file.filename} 
        finally:
            # Clean up the temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        return {"error": str(e), "filename": file.filename}
