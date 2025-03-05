import os
from typing import Dict, List, Any, Optional
import openai
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from src.config.logger import setup_logger

class LLMService:
    """Service for integrating with LLMs (OpenAI, etc.)"""
    
    def __init__(self):
        self.logger = setup_logger("llm_service")
        
        # Get API key from environment
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.use_local_model = os.getenv("USE_LOCAL_MODEL", "false").lower() == "true"
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        
        # Set default model
        self.model_name = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("LLM_MAX_LENGTH", "4096"))
        
        # Initialize the text splitter for chunking large documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Check if we have valid credentials
        self.has_valid_credentials = (
            bool(self.openai_api_key) or 
            bool(self.openrouter_api_key) or 
            self.use_local_model
        )
        
        if not self.has_valid_credentials:
            self.logger.warning("No LLM API keys or local model configuration found. LLM features will be limited.")
        else:
            self.logger.info(f"LLM Service initialized with model: {self.model_name}")
        
        # Determine which API to use - prioritize OpenRouter if it has a key
        if self.openrouter_api_key:
            self.api_type = "openrouter"
            self.logger.info("Using OpenRouter API with OpenAI compatible client")
        elif self.openai_api_key:
            self.api_type = "openai"
            self.logger.info("Using OpenAI API")
        elif self.use_local_model:
            self.api_type = "local"
            self.logger.info("Using local model")
        else:
            self.api_type = "mock"
            self.logger.warning("Using mock LLM responses (no credentials)")
            
    def initialize_client(self):
        """Initialize the OpenAI client with the appropriate API key"""
        if self.api_type == "openai":
            client = ChatOpenAI(
                model=self.model_name,
                temperature=self.temperature,
                openai_api_key=self.openai_api_key,
                max_tokens=self.max_tokens
            )
        elif self.api_type == "openrouter":
            # OpenRouter is compatible with OpenAI's API
            client = ChatOpenAI(
                model=self.model_name,
                temperature=self.temperature,
                openai_api_key=self.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
                max_tokens=self.max_tokens
            )
        else:
            # Use a mock client that just returns the request
            class MockClient:
                def __init__(self, *args, **kwargs):
                    pass
                
                def invoke(self, messages):
                    return {"content": f"Mock response: No LLM available. Would process: {messages[-1].content[:100]}..."}
            
            client = MockClient()
        
        return client
        
    def process_document_query(self, question: str, document_text: str) -> str:
        """
        Process a question against a document using an LLM.
        
        Args:
            question: The user's question
            document_text: The text of the document to analyze
            
        Returns:
            The LLM's response to the question
        """
        self.logger.info(f"Processing document query: {question}")
        self.logger.info(f"Document length: {len(document_text)} characters")
        
        # Check if we have credentials
        if not self.has_valid_credentials:
            self.logger.warning("No LLM credentials available, returning mock response")
            return f"I couldn't process your question '{question}' because no LLM API keys are configured. Please set up OPENAI_API_KEY or OPENROUTER_API_KEY in the environment."
        
        try:
            # Initialize the client
            client = self.initialize_client()
            
            # Split the document into chunks if it's too large
            if len(document_text) > 10000:
                self.logger.info(f"Document is large ({len(document_text)} chars), splitting into chunks")
                chunks = self.text_splitter.split_text(document_text)
                self.logger.info(f"Split document into {len(chunks)} chunks")
                
                # Use a shorter context for analysis due to token limitations
                document_context = "\n\n".join(chunks[:3])  # Use the first 3 chunks
                if len(chunks) > 3:
                    document_context += f"\n\n[Note: Document continues for {len(chunks)-3} more sections...]"
            else:
                document_context = document_text
            
            # Create the prompt template
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an AI assistant that answers questions about documents.
                Analyze the document text and answer the user's question based only on the provided document.
                If the answer cannot be determined from the document, say so clearly.
                Provide specific references to parts of the document to support your answer when possible."""),
                ("user", "Document text: {document}\n\nQuestion: {question}")
            ])
            
            # Format the prompt with our document and question
            formatted_prompt = prompt.format(
                document=document_context,
                question=question
            )
            
            # Log the API call
            self.logger.info(f"Calling {self.api_type} API with prompt length: {len(formatted_prompt)}")
            start_time = __import__('time').time()
            
            # Make the API call
            if self.api_type in ["openai", "openrouter"]:
                response = client.invoke(formatted_prompt)
                answer = response.content
            else:
                # Use mock response for local/mock mode
                answer = f"Based on the document, here's what I found about '{question}': [This is a placeholder response. In production, this would use a real LLM model to generate an answer based on the document content]"
                
            # Log completion
            elapsed_time = __import__('time').time() - start_time
            self.logger.info(f"{self.api_type.capitalize()} API call completed in {elapsed_time:.2f}s")
            
            return answer
            
        except Exception as e:
            self.logger.error(f"Error processing document query: {e}")
            return f"I encountered an error while processing your question: {str(e)}" 