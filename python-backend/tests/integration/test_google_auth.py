import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json
from sqlalchemy.ext.asyncio import AsyncSession

from src.main import app
from src.models.user import User, UserRole

# Create a test client
client = TestClient(app)

@pytest.fixture
def mock_google_user_info():
    """Mock Google user info response"""
    return {
        "sub": "123456789",  # Google ID
        "email": "test@example.com",
        "name": "Test User",
        "picture": "https://example.com/photo.jpg",
        "email_verified": True
    }

@pytest.fixture
def mock_oauth_token():
    """Mock OAuth token response from Google"""
    return {
        "access_token": "mock_access_token",
        "id_token": "mock_id_token",
        "token_type": "Bearer",
        "expires_in": 3600
    }

@pytest.mark.asyncio
async def test_google_login_redirect():
    """Test that Google login redirects to Google's OAuth page"""
    response = client.get("/api/auth/google/login")
    
    # Should be a redirect response
    assert response.status_code == 307
    # Should redirect to Google's OAuth endpoint
    assert "accounts.google.com" in response.headers["location"]

@pytest.mark.asyncio
@patch("src.utils.google_auth.oauth.google.authorize_access_token")
@patch("src.utils.google_auth.get_google_user_info")
async def test_google_callback_new_user(mock_get_user_info, mock_authorize_token, mock_google_user_info, mock_oauth_token):
    """Test Google callback creates a new user when receiving valid token"""
    # Mock the OAuth token validation
    mock_authorize_token.return_value = mock_oauth_token
    
    # Mock the Google user info response
    mock_get_user_info.return_value = mock_google_user_info
    
    # Patch the database session to prevent actual DB operations
    with patch("src.routes.auth_routes.db") as mock_db:
        # Mock the database query for user lookup (return None to simulate new user)
        mock_db.execute.return_value.scalars.return_value.first.return_value = None
        
        # Test the callback
        response = client.get("/api/auth/google/callback")
        
        # Should redirect to frontend with token
        assert response.status_code == 307
        assert "token=" in response.headers["location"]
        
        # Verify a new user was created
        assert mock_db.add.called
        user_model = mock_db.add.call_args[0][0]
        assert isinstance(user_model, User)
        assert user_model.email == mock_google_user_info["email"]
        assert user_model.google_id == mock_google_user_info["sub"]
        assert user_model.role == UserRole.USER

@pytest.mark.asyncio
@patch("src.utils.google_auth.oauth.google.authorize_access_token")
@patch("src.utils.google_auth.get_google_user_info")
async def test_google_callback_existing_user(mock_get_user_info, mock_authorize_token, mock_google_user_info, mock_oauth_token):
    """Test Google callback with existing user"""
    # Mock the OAuth token validation
    mock_authorize_token.return_value = mock_oauth_token
    
    # Mock the Google user info response
    mock_get_user_info.return_value = mock_google_user_info
    
    # Create a mock existing user
    existing_user = User(
        id=1,
        email=mock_google_user_info["email"],
        username="existing_user",
        google_id=mock_google_user_info["sub"],
        role=UserRole.USER,
        is_active=True
    )
    
    # Patch the database session
    with patch("src.routes.auth_routes.db") as mock_db:
        # Mock the database query to return our existing user
        mock_db.execute.return_value.scalars.return_value.first.return_value = existing_user
        
        # Test the callback
        response = client.get("/api/auth/google/callback")
        
        # Should redirect to frontend with token
        assert response.status_code == 307
        assert "token=" in response.headers["location"]
        
        # Should not create a new user
        assert not mock_db.add.called

@pytest.mark.asyncio
@patch("src.utils.google_auth.oauth.google.authorize_access_token")
async def test_google_callback_invalid_token(mock_authorize_token):
    """Test Google callback with invalid token"""
    # Mock token validation to return None (invalid token)
    mock_authorize_token.return_value = None
    
    # Test the callback
    response = client.get("/api/auth/google/callback")
    
    # Should redirect to login with error
    assert response.status_code == 307
    assert "error=" in response.headers["location"]

@pytest.mark.asyncio
@patch("src.utils.google_auth.oauth.google.authorize_access_token")
@patch("src.utils.google_auth.get_google_user_info")
async def test_google_callback_link_to_existing_email(mock_get_user_info, mock_authorize_token, mock_google_user_info, mock_oauth_token):
    """Test Google callback links to existing user with same email"""
    # Mock the OAuth token validation
    mock_authorize_token.return_value = mock_oauth_token
    
    # Mock the Google user info response
    mock_get_user_info.return_value = mock_google_user_info
    
    # Create a mock existing user with same email but no Google ID
    existing_user = User(
        id=1,
        email=mock_google_user_info["email"],
        username="existing_user",
        google_id=None,  # No Google ID yet
        role=UserRole.USER,
        is_active=True
    )
    
    # First query should find no user by Google ID
    # Second query should find user by email
    query_responses = [None, existing_user]
    
    # Patch the database session
    with patch("src.routes.auth_routes.db") as mock_db:
        mock_execute = mock_db.execute
        mock_execute.return_value.scalars.return_value.first.side_effect = query_responses
        
        # Test the callback
        response = client.get("/api/auth/google/callback")
        
        # Should redirect to frontend with token
        assert response.status_code == 307
        assert "token=" in response.headers["location"]
        
        # Should not create a new user, should update existing
        assert not mock_db.add.called
        assert existing_user.google_id == mock_google_user_info["sub"]
        assert existing_user.profile_picture == mock_google_user_info["picture"] 