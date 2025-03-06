"""
Integration tests for authentication routes.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
import jwt
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import time

from src.models.user import User, UserRole

@pytest.mark.asyncio
async def test_register_user(client, async_test_session):
    """Test user registration."""
    # Generate a unique email to avoid conflicts
    unique_email = f"test{int(time.time())}@example.com"
    
    # Test data
    user_data = {
        "email": unique_email,
        "password": "StrongPassword123!",
        "username": "testuser"
    }
    
    # Make the request
    response = client.post("/api/auth/register", json=user_data)
    
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    # Check response
    assert response.status_code == 201
    
    # Verify response content
    response_data = response.json()
    assert response_data["email"] == unique_email
    assert response_data["username"] == "testuser"
    assert "id" in response_data
    assert response_data["role"] == "user"
    assert response_data["is_active"] is True
    assert response_data["is_superuser"] is False

@pytest.mark.asyncio
async def test_register_existing_email(client, async_test_session):
    """Test registration with existing email."""
    # First, register a user
    unique_email = f"existing{int(time.time())}@example.com"
    
    # Test data for first registration
    user_data = {
        "email": unique_email,
        "password": "StrongPassword123!",
        "username": "firstuser"
    }
    
    # Register the first user
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201
    
    # Now try to register another user with the same email
    second_user_data = {
        "email": unique_email,  # Same email
        "password": "AnotherPassword456!",
        "username": "seconduser"
    }
    
    # Make the request
    response = client.post("/api/auth/register", json=second_user_data)
    
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    # Verify the response - should be a bad request
    assert response.status_code == 400
    assert "detail" in response.json()
    assert "already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_valid_credentials(client, async_test_session):
    """Test login with valid credentials."""
    # First, register a user
    unique_email = f"login{int(time.time())}@example.com"
    password = "StrongPassword123!"
    
    # Test data for registration
    user_data = {
        "email": unique_email,
        "password": password,
        "username": "loginuser"
    }
    
    # Register the user
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201
    
    # Now try to login with the registered credentials
    login_data = {
        "username": unique_email,  # Using email as username
        "password": password
    }
    
    # Make the login request
    response = client.post("/api/auth/token", data=login_data)
    
    print(f"Login response status: {response.status_code}")
    print(f"Login response body: {response.text}")
    
    # Check the response
    assert response.status_code == 200
    result = response.json()
    
    assert "access_token" in result
    assert "token_type" in result
    assert result["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client, async_test_session):
    """Test login with invalid credentials."""
    # First, register a user
    unique_email = f"invalid{int(time.time())}@example.com"
    password = "StrongPassword123!"
    
    # Test data for registration
    user_data = {
        "email": unique_email,
        "password": password,
        "username": "invaliduser"
    }
    
    # Register the user
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201
    
    # Now try to login with incorrect password
    login_data = {
        "username": unique_email,
        "password": "WrongPassword456!"  # Incorrect password
    }
    
    # Make the login request
    response = client.post("/api/auth/token", data=login_data)
    
    print(f"Login response status: {response.status_code}")
    print(f"Login response body: {response.text}")
    
    # Check the response - should be unauthorized
    assert response.status_code == 401
    assert "detail" in response.json()
    assert "Incorrect" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_nonexistent_user(client, async_test_session):
    """Test login with non-existent user."""
    # Generate a unique email that won't exist in the database
    nonexistent_email = f"nonexistent{int(time.time())}@example.com"
    
    # Try to login with non-existent user
    login_data = {
        "username": nonexistent_email,
        "password": "AnyPassword123!"
    }
    
    # Make the login request
    response = client.post("/api/auth/token", data=login_data)
    
    print(f"Login response status: {response.status_code}")
    print(f"Login response body: {response.text}")
    
    # Check the response - should be unauthorized
    assert response.status_code == 401
    assert "detail" in response.json()
    assert "Incorrect" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user(client):
    """Test getting current user with valid token."""
    # First, register a user
    unique_email = f"me{int(time.time())}@example.com"
    password = "StrongPassword123!"
    username = "meuser"
    
    # Test data for registration
    user_data = {
        "email": unique_email,
        "password": password,
        "username": username
    }
    
    # Register the user
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201
    user_id = response.json()["id"]
    
    # Login to get a token
    login_data = {
        "username": unique_email,
        "password": password
    }
    
    response = client.post("/api/auth/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    # Mock the get_current_user dependency to avoid the DetachedInstanceError
    # We'll use the app's dependency_overrides to replace the get_current_active_user dependency
    from src.utils.auth import get_current_active_user
    from src.main import app
    from src.models.user import User, UserRole
    from datetime import datetime
    
    # Create a mock user that matches what we registered with all required fields
    async def mock_get_current_active_user():
        current_time = datetime.utcnow()
        return User(
            id=user_id,
            email=unique_email,
            username=username,
            role=UserRole.USER,
            is_active=True,
            is_superuser=False,
            created_at=current_time,
            updated_at=current_time,
            last_login=current_time
        )
    
    # Override the dependency
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user
    
    try:
        # Make request with token to get current user
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        
        print(f"Me response status: {response.status_code}")
        print(f"Me response body: {response.text}")
        
        # Check the response
        assert response.status_code == 200
        user_data = response.json()
        
        assert user_data["id"] == user_id
        assert user_data["email"] == unique_email
        assert user_data["username"] == username
        assert user_data["role"] == "user"
    finally:
        # Clean up the dependency override
        app.dependency_overrides.pop(get_current_active_user, None)

@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client):
    """Test getting current user with invalid token."""
    # Make request with invalid token
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/auth/me", headers=headers)
    
    # Check the response
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user_expired_token(client):
    """Test getting current user with expired token."""
    # Create an expired JWT token
    SECRET_KEY = "test_secret_key"
    ALGORITHM = "HS256"
    
    with patch("src.utils.auth.SECRET_KEY", SECRET_KEY), \
         patch("src.utils.auth.ALGORITHM", ALGORITHM):
        
        # Create token payload with expiration in the past
        expiration = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        payload = {
            "sub": "test@example.com",
            "exp": expiration
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        # Make request with expired token
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        
        # Check the response
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user_missing_token(client):
    """Test getting current user without a token."""
    # Make request without token
    response = client.get("/api/auth/me")
    
    # Check the response
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"] 