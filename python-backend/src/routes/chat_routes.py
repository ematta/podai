from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import os
import asyncio
import random
from typing import Dict, Any
from src.config.logger import setup_logger
from src.services.pdf_service import PDFService

# Create router
router = APIRouter()

# Initialize logger
logger = setup_logger("chat_routes")

# Initialize PDF service
pdf_service = PDFService()

# Simple chat endpoint
@router.post("/send")
async def send_message(request: Request):
    try:
        data = await request.json()
        message = data.get("message", "")
        logger.info(f"Received chat message: {message}")
        
        # This is a placeholder for actual chat functionality
        return {
            "success": True,
            "response": f"You sent: {message}"
        }
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat message: {str(e)}")

# RAG chat endpoint
@router.post("/rag")
async def rag_chat(request: Request):
    try:
        data = await request.json()
        question = data.get("question", "")
        file_id = data.get("fileId", "")
        
        logger.info(f"Received RAG chat question: {question} for file ID: {file_id}")
        
        if not file_id:
            raise HTTPException(status_code=400, detail="File ID is required")
        
        if not question:
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Get the file path based on the file ID
        upload_folder = os.getenv("UPLOAD_FOLDER", "/tmp/uploads")
        file_path = f"{upload_folder}/{file_id}"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        # Extract text from the PDF if needed
        pdf_text, _ = pdf_service._extract_text_from_pdf(file_path)
        
        # Create a response based on the question and PDF content
        # In a real implementation, this would use an LLM to generate a response based on the PDF content
        response = generate_answer_for_pdf(question, pdf_text)
        
        return {
            "success": True,
            "answer": response,
            "fileId": file_id
        }
        
    except HTTPException as e:
        # Re-raise HTTP exceptions to maintain the status code
        raise
    except Exception as e:
        logger.error(f"Error processing RAG chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing RAG chat: {str(e)}")

# Streaming RAG chat endpoint
@router.post("/rag/stream")
async def rag_chat_stream(request: Request):
    try:
        data = await request.json()
        question = data.get("question", "")
        file_id = data.get("fileId", "")
        
        logger.info(f"Received streaming RAG chat question: {question} for file ID: {file_id}")
        
        if not file_id:
            raise HTTPException(status_code=400, detail="File ID is required")
        
        if not question:
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Get the file path based on the file ID
        upload_folder = os.getenv("UPLOAD_FOLDER", "/tmp/uploads")
        file_path = f"{upload_folder}/{file_id}"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        # Extract text from the PDF if needed
        pdf_text, _ = pdf_service._extract_text_from_pdf(file_path)
        
        # Create a streaming response function
        async def generate_stream():
            # Generate a response based on the question and PDF content
            response = generate_answer_for_pdf(question, pdf_text)
            
            # Split the response into words to simulate streaming
            words = response.split()
            
            for word in words:
                # Add a space after each word except the first
                yield f"{word} "
                # Simulate processing time
                await asyncio.sleep(0.05)
        
        return StreamingResponse(generate_stream(), media_type="text/event-stream")
        
    except HTTPException as e:
        # Re-raise HTTP exceptions to maintain the status code
        raise
    except Exception as e:
        logger.error(f"Error processing streaming RAG chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing streaming RAG chat: {str(e)}")

def generate_answer_for_pdf(question: str, pdf_text: str) -> str:
    """
    Generate a response based on the question and PDF content.
    This is a simple implementation that would normally use an AI model.
    """
    # Normalize question to lowercase for simple keyword matching
    question_lower = question.lower()
    
    # Extract a small relevant section based on naive keyword matching
    # This is a very simple implementation - a real system would use semantic search, embedding, etc.
    paragraphs = pdf_text.split('\n\n')
    relevant_paragraphs = []
    
    # Extract keywords from the question
    keywords = [w for w in question_lower.split() if len(w) > 3 and w not in {
        'what', 'where', 'when', 'who', 'why', 'how', 'does', 'did', 'would', 'could',
        'should', 'about', 'have', 'this', 'that', 'these', 'those', 'there'
    }]
    
    # Find paragraphs containing keywords
    for para in paragraphs:
        para_lower = para.lower()
        if any(keyword in para_lower for keyword in keywords):
            relevant_paragraphs.append(para)
    
    # If no relevant paragraphs found, use the first few paragraphs
    if not relevant_paragraphs and paragraphs:
        relevant_paragraphs = paragraphs[:3]
    
    # Craft a response based on the context
    if 'summarize' in question_lower or 'summary' in question_lower:
        return f"Here's a summary of the document:\n\n{' '.join(relevant_paragraphs[:3])}"
    
    elif 'main topic' in question_lower or 'main idea' in question_lower or 'about' in question_lower:
        return f"The document appears to be about: {relevant_paragraphs[0] if relevant_paragraphs else 'various topics'}"
    
    else:
        # Generic response
        if relevant_paragraphs:
            return f"Based on the document, here's what I found about your question:\n\n{' '.join(relevant_paragraphs[:2])}"
        else:
            return "I couldn't find specific information about your question in the document. Could you rephrase or ask something else about the content?" 