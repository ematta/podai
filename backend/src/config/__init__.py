from flask import Flask
from flask_cors import CORS  # type: ignore
import os
from .logging import configure_logging

def create_app():
    app = Flask(__name__)
    configure_logging(app)
    CORS(app)
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    return app
