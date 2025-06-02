import tempfile
import os
from openai import OpenAI
import pymupdf4llm
from fastapi import UploadFile
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


async def parse_pdf_to_markdown(file: UploadFile):
    if not file.filename:
        return {"error": "No filename provided for uploaded file."}

    try:
        file_content = await file.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            markdown_content = pymupdf4llm.to_markdown(temp_file_path)
            return {"filename": file.filename, "content_markdown": markdown_content}
        except Exception as e:
            return {"error": str(e), "filename": file.filename} 
        finally:
            os.unlink(temp_file_path)
            
    except Exception as e:
        return {"error": str(e), "filename": file.filename}

async def process_markdown_to_podcast(text: str):
    # 1. Open the prompt/script.md file and read its content
    try:
        script_md_path = os.path.join(os.path.dirname(__file__), "prompt", "script.md")
        with open(script_md_path, "r") as file:
            script_content = file.read()
    except FileNotFoundError:
        return {"error": "Script file not found."}
    
    # 2. Combine the script content with the markdown content
    combined_content = f"{script_content}\n\n{text}"

    # 3. Send the combined content to the LLM for further processing using OpenRouter
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),  # Ensure you have set your OpenAI API key in the config
    )

    completion = client.chat.completions.create(
        model="google/gemini-2.5-flash-preview-05-20",
        messages=[
            {
                "role": "user",
                "content": combined_content
            }
        ]
    )
    # 4. Return the processed content
    return {
        "filename": "processed_content.md",
        "content_markdown": completion.choices[0].message.content
    }