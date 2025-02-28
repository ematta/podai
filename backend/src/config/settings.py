import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    # File handling settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../../uploads')
    MAX_UPLOAD_SIZE = 16 * 1024 * 1024  # 16MB
    
    # Logging settings
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # LLM settings
    HUGGINGFACE_API_TOKEN = os.getenv('HUGGINGFACE_API_TOKEN')
    LLM_MODEL = "meta-llama/Meta-Llama-3.2-3B-Instruct"
    LLM_TEMPERATURE = 0.7
    LLM_MAX_LENGTH = 2048

settings = Settings()
