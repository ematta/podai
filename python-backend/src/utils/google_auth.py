import os
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.requests import Request
from typing import Dict, Any, Optional
import httpx
import logging

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback")

# Create OAuth client
config = Config(environ=os.environ)
oauth = OAuth(config)
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

logger = logging.getLogger(__name__)

async def get_google_user_info(token: str) -> Optional[Dict[str, Any]]:
    """Get user info from Google API using the access token"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                return await response.json()
            else:
                logger.error(f"Failed to get Google user info: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"Error getting Google user info: {e}")
        return None

async def get_google_oauth_url(request: Request) -> str:
    """Get the Google OAuth URL for the login redirect"""
    return await oauth.google.authorize_redirect(request, REDIRECT_URI)

async def validate_google_token(request: Request) -> Optional[Dict[str, Any]]:
    """Validate the Google OAuth token and get user info"""
    try:
        token = await oauth.google.authorize_access_token(request)
        if not token:
            logger.warning("No token returned from Google OAuth")
            return None
            
        user_info = await get_google_user_info(token["access_token"])
        return user_info
    except Exception as e:
        logger.error(f"Error validating Google token: {e}")
        return None 