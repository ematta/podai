import os
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.requests import Request
from typing import Dict, Any, Optional
import httpx

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

async def get_google_user_info(token: str) -> Optional[Dict[str, Any]]:
    """Get user information from Google API using the provided token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            return response.json()
        return None

def get_google_oauth_url(request: Request) -> str:
    """Get the Google OAuth URL for authentication"""
    return oauth.google.authorize_redirect(request, REDIRECT_URI)
    
async def validate_google_token(request: Request) -> Optional[Dict[str, Any]]:
    """Validate the Google token from the redirect and return user info"""
    token = await oauth.google.authorize_access_token(request)
    if token:
        user_info = await get_google_user_info(token.get("access_token"))
        return user_info
    return None 