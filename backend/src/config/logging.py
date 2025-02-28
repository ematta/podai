import logging
from logging.handlers import RotatingFileHandler

def configure_logging(app):
    handler = RotatingFileHandler(
        'app.log',
        maxBytes=1024 * 1024 * 10,  # 10MB
        backupCount=5
    )
    handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)
