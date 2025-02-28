import os

class Settings:
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../../uploads')
    MAX_UPLOAD_SIZE = 16 * 1024 * 1024  # 16MB
    LOG_LEVEL = 'INFO'

settings = Settings()
