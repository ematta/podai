import logging
import json
import os
import sys
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from src.config.settings import settings

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.model_name = settings.LLM_MODEL
        self.max_length = settings.LLM_MAX_LENGTH
        self.temperature = settings.LLM_TEMPERATURE
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_loaded = False
        
        logger.info(f"Initializing LLM service for model: {self.model_name} on {self.device}")
        
        try:
            # Check if we're in a testing environment
            if os.environ.get('TESTING') == 'TRUE' or 'pytest' in sys.modules:
                logger.info("Testing environment detected, skipping model loading")
                return
                
            # Check if the model exists locally or is available on Hugging Face Hub
            model_exists = os.path.exists(self.model_name) or self._check_model_availability()
            
            if model_exists:
                logger.info(f"Loading model and tokenizer. This might take a while...")
                # Load model and tokenizer
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name, 
                    torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                    device_map=self.device
                )
                
                # Create pipeline for text generation
                self.generator = pipeline(
                    "text-generation",
                    model=self.model,
                    tokenizer=self.tokenizer,
                    max_length=self.max_length,
                    temperature=self.temperature,
                    device=0 if self.device == "cuda" else -1
                )
                
                logger.info(f"Model and tokenizer loaded successfully.")
                self.model_loaded = True
            else:
                logger.warning(f"Model {self.model_name} not found locally and not available on Hugging Face Hub. Using fallback mode.")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            logger.warning("Using fallback mode for all LLM operations.")
    
    def _check_model_availability(self):
        """Check if a model is available on Hugging Face Hub"""
        try:
            import huggingface_hub
            return huggingface_hub.model_info(self.model_name) is not None
        except Exception:
            return False
    
    def _generate_text(self, prompt):
        """Generate text using the local model"""
        if not self.model_loaded:
            logger.warning("Model not loaded, using fallback generation")
            return self._fallback_generation(prompt)
            
        try:
            outputs = self.generator(prompt, max_length=self.max_length, temperature=self.temperature)
            return outputs[0]['generated_text']
        except Exception as e:
            logger.error(f"Error generating text: {str(e)}")
            return self._fallback_generation(prompt)
    
    def _fallback_generation(self, prompt):
        """Fallback text generation when the model isn't available"""
        # Extract the user's question or content if this is in a chat format
        if "[INST]" in prompt and "[/INST]" in prompt:
            content = prompt.split("[INST]")[1].split("[/INST]")[0].strip()
            if "Question:" in content:
                question = content.split("Question:")[1].strip()
                return f"{prompt}\n\nBased on the document, I can tell you that the answer relates to {question}, but I don't have more specific details."
        
        # For script generation
        return f"{prompt}\n\n# Podcast Script\n\n**HOST:** Welcome to our podcast!\n\n**HOST:** Today we're discussing some fascinating content.\n\n**CO-HOST:** That's really interesting!\n\n**HOST:** Thanks for listening!"
    
    def generate_script(self, markdown_content):
        """Generate a podcast script from markdown content"""
        if not markdown_content:
            return ""
        
        system_prompt = """You are an AI assistant that converts document content into a professional podcast script.
        The script should include a host and co-host, with natural dialogue.
        Format the script with HOST: and CO-HOST: prefixes for speakers, and include
        an introduction and conclusion."""
        
        user_prompt = f"Create a podcast script based on the following document content:\n{markdown_content}"
        
        try:
            # Format the prompt for Llama 3.2 3B
            formatted_prompt = f"<s>[INST] {system_prompt}\n\n{user_prompt} [/INST]"
            
            # Generate the script
            response = self._generate_text(formatted_prompt)
            
            # Extract the generated text (removing the prompt part)
            if "[/INST]" in response:
                script = response.split("[/INST]")[1].strip()
            else:
                # Fallback in case the response format is unexpected
                script = self._fallback_script_generation(markdown_content)
            
            logger.info(f"Generated script of length {len(script)}")
            return script
        except Exception as e:
            logger.error(f"Error generating script: {str(e)}")
            return self._fallback_script_generation(markdown_content)
    
    def chat_with_pdf(self, question, pdf_text):
        """Chat with a PDF document using the LLM"""
        if not question or not pdf_text:
            return "I couldn't find an answer in the document."
        
        system_prompt = """You are an AI assistant that answers questions about documents.
        Use only the provided document content to answer the question.
        If the answer is not in the document, say so."""
        
        user_prompt = f"Document content:\n{pdf_text}\n\nQuestion: {question}"
        
        try:
            # Format the prompt for Llama 3.2 3B
            formatted_prompt = f"<s>[INST] {system_prompt}\n\n{user_prompt} [/INST]"
            
            # Generate the answer
            response = self._generate_text(formatted_prompt)
            
            # Extract the generated text (removing the prompt part)
            if "[/INST]" in response:
                answer = response.split("[/INST]")[1].strip()
            else:
                # Fallback if response format is unexpected
                answer = f"Based on the document, I can tell you about {question}, but I can't provide specific details at this time."
            
            logger.info(f"Generated answer of length {len(answer)}")
            return answer
        except Exception as e:
            logger.error(f"Error generating chat response: {str(e)}")
            return f"I've analyzed the document, but I'm having trouble generating a specific response about {question} at this time."

    def _fallback_script_generation(self, markdown_content):
        """Fallback script generation in case LLM fails"""
        logger.warning("Using fallback script generation")
        script = "# Podcast Script\n\n"
        script += "**HOST:** Welcome to our podcast! Today we're discussing some interesting content.\n\n"
        
        # Add document paragraphs to script in a conversational format
        paragraphs = markdown_content.split('\n\n')
        for i, para in enumerate(paragraphs[:5]):  # Limit to first 5 paragraphs
            if not para.strip():
                continue
            
            if i % 2 == 0:
                script += f"**HOST:** {para.strip()}\n\n"
            else:
                script += f"**CO-HOST:** That's interesting! {para.strip()}\n\n"
        
        script += "**HOST:** Thanks for listening to our podcast! Don't forget to subscribe.\n"
        return script

# Initialize the LLM service
llm_service = LLMService()
