from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import os
import asyncio
import random
from typing import Dict, Any
from src.config.logger import setup_logger
from src.services.pdf_service import PDFService
from src.services.llm_service import LLMService
import time
import uuid

# Create router
router = APIRouter()

# Initialize logger
logger = setup_logger("chat_routes")

# Initialize services
pdf_service = PDFService()
llm_service = LLMService()

# Simple chat endpoint
@router.post("/send")
async def send_message(request: Request):
    # Generate unique message ID for tracking
    message_id = str(uuid.uuid4())
    client_ip = request.client.host if request.client else "unknown"
    
    try:
        data = await request.json()
        message = data.get("message", "")
        user_id = data.get("userId", "anonymous")
        
        # Log the received message with metadata
        logger.info(f"Message received [ID:{message_id}] from user [{user_id}] at [{client_ip}]: {message}")
        
        # This is a placeholder for actual chat functionality
        response = f"You sent: {message}"
        
        # Log the response being sent back
        logger.info(f"Message response [ID:{message_id}] to user [{user_id}]: {response}")
        
        return {
            "success": True,
            "response": response,
            "messageId": message_id
        }
    except Exception as e:
        logger.error(f"Error processing chat message [ID:{message_id}]: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat message: {str(e)}")

# RAG chat endpoint
@router.post("/rag")
async def rag_chat(request: Request):
    # Generate unique message ID for tracking
    message_id = str(uuid.uuid4())
    request_start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    
    try:
        data = await request.json()
        question = data.get("question", "")
        file_id = data.get("fileId", "")
        user_id = data.get("userId", "anonymous")
        
        logger.info(f"RAG question received [ID:{message_id}] from user [{user_id}] at [{client_ip}]: {question}")
        logger.info(f"File ID for RAG query [ID:{message_id}]: {file_id}")
        
        if not file_id:
            logger.warning(f"Missing file ID in RAG request [ID:{message_id}]")
            raise HTTPException(status_code=400, detail="File ID is required")
        
        if not question:
            logger.warning(f"Missing question in RAG request [ID:{message_id}]")
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Get the file path based on the file ID
        upload_folder = os.getenv("UPLOAD_FOLDER", "/tmp/uploads")
        file_path = f"{upload_folder}/{file_id}"
        
        if not os.path.exists(file_path):
            logger.error(f"File not found for RAG request [ID:{message_id}]: {file_id}")
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        # Extract text from the PDF
        extraction_start = time.time()
        pdf_text, _ = pdf_service._extract_text_from_pdf(file_path)
        extraction_time = time.time() - extraction_start
        logger.info(f"PDF text extraction completed [ID:{message_id}] in {extraction_time:.2f}s - Characters: {len(pdf_text)}")
        
        # Use LLM service to generate a response
        generation_start = time.time()
        response = llm_service.process_document_query(question, pdf_text)
        generation_time = time.time() - generation_start
        
        # Log the response
        logger.info(f"RAG answer generated [ID:{message_id}] in {generation_time:.2f}s - Characters: {len(response)}")
        
        # Calculate total processing time
        total_time = time.time() - request_start_time
        logger.info(f"RAG request completed [ID:{message_id}] in {total_time:.2f}s")
        
        return {
            "success": True,
            "answer": response,
            "fileId": file_id,
            "messageId": message_id,
            "processingTimeMs": int(total_time * 1000)
        }
        
    except HTTPException as e:
        # Re-raise HTTP exceptions to maintain the status code
        raise
    except Exception as e:
        logger.error(f"Error processing RAG chat [ID:{message_id}]: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing RAG chat: {str(e)}")

# Streaming RAG chat endpoint
@router.post("/rag/stream")
async def rag_chat_stream(request: Request):
    # Generate unique message ID for tracking
    message_id = str(uuid.uuid4())
    request_start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    
    try:
        data = await request.json()
        question = data.get("question", "")
        file_id = data.get("fileId", "")
        user_id = data.get("userId", "anonymous")
        
        logger.info(f"Streaming RAG question received [ID:{message_id}] from user [{user_id}] at [{client_ip}]: {question}")
        logger.info(f"File ID for streaming RAG query [ID:{message_id}]: {file_id}")
        
        if not file_id:
            logger.warning(f"Missing file ID in streaming RAG request [ID:{message_id}]")
            raise HTTPException(status_code=400, detail="File ID is required")
        
        if not question:
            logger.warning(f"Missing question in streaming RAG request [ID:{message_id}]")
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Get the file path based on the file ID
        upload_folder = os.getenv("UPLOAD_FOLDER", "/tmp/uploads")
        file_path = f"{upload_folder}/{file_id}"
        
        if not os.path.exists(file_path):
            logger.error(f"File not found for streaming RAG request [ID:{message_id}]: {file_id}")
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        # Extract text from the PDF
        extraction_start = time.time()
        pdf_text, _ = pdf_service._extract_text_from_pdf(file_path)
        extraction_time = time.time() - extraction_start
        logger.info(f"PDF text extraction completed [ID:{message_id}] in {extraction_time:.2f}s - Characters: {len(pdf_text)}")
        
        # Create a streaming response function
        async def generate_stream():
            logger.info(f"Starting streaming response [ID:{message_id}]")
            stream_start_time = time.time()
            
            # Generate a full response first
            full_response = llm_service.process_document_query(question, pdf_text)
            
            # Log the full response that will be streamed
            logger.info(f"Full streaming response prepared [ID:{message_id}] - Characters: {len(full_response)}")
            
            # Split the response into words to simulate streaming
            words = full_response.split()
            total_words = len(words)
            words_sent = 0
            
            for word in words:
                # Add a space after each word except the first
                yield f"{word} "
                words_sent += 1
                
                # Log progress every 20 words
                if words_sent % 20 == 0:
                    logger.debug(f"Streaming progress [ID:{message_id}]: {words_sent}/{total_words} words sent")
                
                # Simulate processing time
                await asyncio.sleep(0.05)
            
            stream_time = time.time() - stream_start_time
            logger.info(f"Streaming response completed [ID:{message_id}] in {stream_time:.2f}s - {total_words} words sent")
            
            # Calculate total processing time
            total_time = time.time() - request_start_time
            logger.info(f"Streaming RAG request completed [ID:{message_id}] in {total_time:.2f}s")
        
        return StreamingResponse(generate_stream(), media_type="text/event-stream")
        
    except HTTPException as e:
        # Re-raise HTTP exceptions to maintain the status code
        raise
    except Exception as e:
        logger.error(f"Error processing streaming RAG chat [ID:{message_id}]: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing streaming RAG chat: {str(e)}") 