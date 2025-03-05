from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
import sys

from src.config.logger import setup_logger

# Initialize logger
logger = setup_logger("error_handler")

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors
    """
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation error",
            "detail": exc.errors()
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle HTTP exceptions
    """
    logger.error(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": f"HTTP Error {exc.status_code}",
            "detail": exc.detail
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all other exceptions
    """
    # Get the full traceback
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    
    logger.error(f"Unhandled exception: {exc}")
    logger.error("".join(tb))
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal Server Error",
            "detail": str(exc)
        }
    ) 