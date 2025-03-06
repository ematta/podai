"""
Unit tests for Google authentication utility functions.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import httpx
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request

from src.utils.google_auth import (
    get_google_user_info,
    get_google_oauth_url,
    validate_google_token,
    REDIRECT_URI
)

@pytest.mark.asyncio
async def test_get_google_user_info_success():
    """Test getting Google user info with a successful response."""
    # Mock user data
    mock_user_info = {
        "sub": "123456789",
        "email": "test@example.com",
        "name": "Test User",
        "picture": "https://example.com/photo.jpg"
    }
    
    # Mock httpx.AsyncClient and response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_info
    
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    
    # Mock httpx.AsyncClient context manager
    with patch('httpx.AsyncClient', return_value=mock_client):
        # Call the function
        result = await get_google_user_info("mock_token")
        
        # Verify result
        assert result == mock_user_info
        
        # Verify the API call was made correctly
        mock_client.get.assert_called_once_with(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": "Bearer mock_token"}
        )

@pytest.mark.asyncio
async def test_get_google_user_info_failure():
    """Test getting Google user info with a failed response."""
    # Mock unsuccessful response
    mock_response = MagicMock()
    mock_response.status_code = 401  # Unauthorized
    
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    
    # Mock httpx.AsyncClient context manager
    with patch('httpx.AsyncClient', return_value=mock_client):
        # Call the function
        result = await get_google_user_info("invalid_token")
        
        # Verify result is None for unsuccessful response
        assert result is None

def test_get_google_oauth_url():
    """Test getting the Google OAuth URL."""
    # Create a mock request
    mock_request = MagicMock(spec=Request)
    
    # Mock the oauth.google.authorize_redirect method
    expected_url = "https://accounts.google.com/o/oauth2/auth?client_id=123&redirect_uri=..."
    
    with patch('src.utils.google_auth.oauth') as mock_oauth:
        mock_oauth.google.authorize_redirect.return_value = expected_url
        
        # Call the function
        result = get_google_oauth_url(mock_request)
        
        # Verify result
        assert result == expected_url
        
        # Verify the method was called with correct parameters
        mock_oauth.google.authorize_redirect.assert_called_once_with(
            mock_request, REDIRECT_URI
        )

@pytest.mark.asyncio
async def test_validate_google_token_success():
    """Test validating a Google token successfully."""
    # Mock token and user info
    mock_token = {
        "access_token": "mock_access_token",
        "id_token": "mock_id_token",
        "token_type": "Bearer"
    }
    
    mock_user_info = {
        "sub": "123456789",
        "email": "test@example.com",
        "name": "Test User"
    }
    
    # Create a mock request
    mock_request = MagicMock(spec=Request)
    
    # Setup mocks
    with patch('src.utils.google_auth.oauth') as mock_oauth, \
         patch('src.utils.google_auth.get_google_user_info', return_value=mock_user_info) as mock_get_info:
        
        # Configure the mock
        mock_oauth.google.authorize_access_token.return_value = mock_token
        
        # Call the function
        result = await validate_google_token(mock_request)
        
        # Verify result
        assert result == mock_user_info
        
        # Verify the methods were called correctly
        mock_oauth.google.authorize_access_token.assert_called_once_with(mock_request)
        mock_get_info.assert_called_once_with(mock_token["access_token"])

@pytest.mark.asyncio
async def test_validate_google_token_failure():
    """Test validating an invalid Google token."""
    # Create a mock request
    mock_request = MagicMock(spec=Request)
    
    # Setup mocks
    with patch('src.utils.google_auth.oauth') as mock_oauth:
        # Configure the mock to return None (invalid token)
        mock_oauth.google.authorize_access_token.return_value = None
        
        # Call the function
        result = await validate_google_token(mock_request)
        
        # Verify result is None for invalid token
        assert result is None
        
        # Verify the method was called
        mock_oauth.google.authorize_access_token.assert_called_once_with(mock_request)

@pytest.mark.asyncio
async def test_validate_google_token_with_user_info_failure():
    """Test validating a valid token but failing to get user info."""
    # Mock token
    mock_token = {
        "access_token": "mock_access_token",
        "id_token": "mock_id_token",
        "token_type": "Bearer"
    }
    
    # Create a mock request
    mock_request = MagicMock(spec=Request)
    
    # Setup mocks
    with patch('src.utils.google_auth.oauth') as mock_oauth, \
         patch('src.utils.google_auth.get_google_user_info', return_value=None) as mock_get_info:
        
        # Configure the mock
        mock_oauth.google.authorize_access_token.return_value = mock_token
        
        # Call the function
        result = await validate_google_token(mock_request)
        
        # Verify result is None for failed user info
        assert result is None
        
        # Verify the methods were called correctly
        mock_oauth.google.authorize_access_token.assert_called_once_with(mock_request)
        mock_get_info.assert_called_once_with(mock_token["access_token"]) 