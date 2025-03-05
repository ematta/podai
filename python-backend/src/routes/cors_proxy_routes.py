import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from typing import Dict, Any, Optional
from src.config.logger import setup_logger

# Create router
router = APIRouter()

# Initialize logger
logger = setup_logger("cors_proxy_routes")

# List of allowed domains for proxying
ALLOWED_DOMAINS = [
    "api.openai.com",
    "api.anthropic.com",
    "api.cohere.ai",
    "api.openrouter.ai",
    "api.huggingface.co"
]

@router.post("/{path:path}")
async def proxy_post(path: str, request: Request):
    """Proxy POST requests to external APIs"""
    return await proxy_request("POST", path, request)

@router.get("/{path:path}")
async def proxy_get(path: str, request: Request):
    """Proxy GET requests to external APIs"""
    return await proxy_request("GET", path, request)

@router.put("/{path:path}")
async def proxy_put(path: str, request: Request):
    """Proxy PUT requests to external APIs"""
    return await proxy_request("PUT", path, request)

@router.delete("/{path:path}")
async def proxy_delete(path: str, request: Request):
    """Proxy DELETE requests to external APIs"""
    return await proxy_request("DELETE", path, request)

async def proxy_request(method: str, path: str, request: Request) -> Response:
    """Generic proxy request handler"""
    # Get target URL from query params or headers
    target_url = request.query_params.get("url")
    
    if not target_url:
        logger.error("No target URL provided")
        raise HTTPException(status_code=400, detail="No target URL provided")
    
    # Check if domain is allowed
    if not any(domain in target_url for domain in ALLOWED_DOMAINS):
        logger.error(f"Domain not allowed for URL: {target_url}")
        raise HTTPException(status_code=403, detail="Domain not allowed")
    
    # Get request body if any
    try:
        body = await request.body()
    except Exception:
        body = None
    
    # Get request headers (excluding host, etc.)
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)
    
    try:
        logger.info(f"Proxying {method} request to {target_url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=target_url,
                headers=headers,
                content=body,
                follow_redirects=True,
                timeout=60.0
            )
            
            # Create FastAPI response with same status and headers
            content = response.content
            status_code = response.status_code
            
            # Copy relevant headers
            response_headers = dict(response.headers)
            response_headers.pop("server", None)
            response_headers.pop("transfer-encoding", None)
            
            logger.info(f"Proxied response status: {status_code}")
            
            return Response(
                content=content,
                status_code=status_code,
                headers=response_headers
            )
    except Exception as e:
        logger.error(f"Error proxying request: {e}")
        raise HTTPException(status_code=500, detail=f"Error proxying request: {str(e)}") 