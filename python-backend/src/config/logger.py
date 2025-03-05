import logging
import os
import json
import sys
from logging.handlers import RotatingFileHandler

def setup_logger(name, log_level=None):
    """
    Set up a logger with the specified name and log level
    """
    if log_level is None:
        log_level = os.getenv("LOG_LEVEL", "info").upper()
    
    # Convert string log level to logging constant
    numeric_level = getattr(logging, log_level, None)
    if not isinstance(numeric_level, int):
        numeric_level = logging.INFO
    
    logger = logging.getLogger(name)
    logger.setLevel(numeric_level)
    
    # Clear existing handlers
    logger.handlers = []
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    # Create file handler if LOG_FILE is set
    log_file = os.getenv("LOG_FILE")
    if log_file:
        file_handler = RotatingFileHandler(log_file, maxBytes=10485760, backupCount=5)
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

class JsonLogger:
    """
    A logger that formats messages as JSON
    """
    def __init__(self, name):
        self.logger = setup_logger(name)
    
    def _format_json(self, message, extra=None):
        data = {
            "message": message
        }
        if extra:
            data.update(extra)
        return json.dumps(data)
    
    def info(self, message, extra=None):
        if extra and isinstance(extra, dict):
            self.logger.info(self._format_json(message, extra))
        else:
            self.logger.info(message)
    
    def error(self, message, extra=None):
        if extra and isinstance(extra, dict):
            self.logger.error(self._format_json(message, extra))
        else:
            self.logger.error(message)
    
    def warning(self, message, extra=None):
        if extra and isinstance(extra, dict):
            self.logger.warning(self._format_json(message, extra))
        else:
            self.logger.warning(message)
    
    def debug(self, message, extra=None):
        if extra and isinstance(extra, dict):
            self.logger.debug(self._format_json(message, extra))
        else:
            self.logger.debug(message)