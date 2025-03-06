"""
Integration tests for authentication routes.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import jwt
import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User, UserRole

@pytest.mark.asyncio
async def test_register_user(client, async_test_session):
    """Test user registration."""
    with patch("src.routes.auth_routes.db") as mock_db:
        # Configure the mock to return our test session
        mock_db.return_value = async_test_session
        
        # Mock the check for existing user
        mock_db.execute.return_value.scalars.return_value.first.return_value = None
        
        # Test data
        user_data = {
            "email": "test@example.com",
            "password": "StrongPassword123!",
            "username": "testuser"
        }
        
        # Make the request
        response = client.post("/api/auth/register", json=user_data)
        
        # Check the response
        assert response.status_code == 201
        result = response.json()
        
        assert "access_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"
        
        # Verify a user was added
        assert mock_db.add.called

@pytest.mark.asyncio
async def test_register_existing_email(client, async_test_session):
    """Test registration with existing email."""
    with patch("src.routes.auth_routes.db") as mock_db:
        # Configure the mock to return our test session
        mock_db.return_value = async_test_session
        
        # Mock that a user with the email already exists
        existing_user = User(
            id=1,
            email="test@example.com",
            username="existinguser",
            role=UserRole.USER,
            is_active=True
        )
        mock_db.execute.return_value.scalars.return_value.first.return_value = existing_user
        
        # Test data
        user_data = {
            "email": "test@example.com",
            "password": "StrongPassword123!",
            "username": "testuser"
        }
        
        # Make the request
        response = client.post("/api/auth/register", json=user_data)
        
        # Check the response
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_valid_credentials(client, async_test_session):
    """Test login with valid credentials."""
    with patch("src.routes.auth_routes.db") as mock_db, \
         patch("src.routes.auth_routes.verify_password") as mock_verify:
        
        # Configure the mock to return our test session
        mock_db.return_value = async_test_session
        
        # Create a mock user with hashed password
        existing_user = User(
            id=1,
            email="test@example.com",
            username="testuser",
            hashed_password="hashed_password",
            role=UserRole.USER,
            is_active=True
        )
        
        # Mock the database lookup to return our user
        mock_db.execute.return_value.scalars.return_value.first.return_value = existing_user
        
        # Mock the password verification to return True
        mock_verify.return_value = True
        
        # Test data
        login_data = {
            "username": "test@example.com",  # Using email as username
            "password": "StrongPassword123!"
        }
        
        # Make the request
        response = client.post("/api/auth/token", data=login_data)
        
        # Check the response
        assert response.status_code == 200
        result = response.json()
        
        assert "access_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client, async_test_session):
    """Test login with invalid credentials."""
    with patch("src.routes.auth_routes.db") as mock_db, \
         patch("src.routes.auth_routes.verify_password") as mock_verify:
        
        # Configure the mock to return our test session
        mock_db.return_value = async_test_session
        
        # Create a mock user with hashed password
        existing_user = User(
            id=1,
            email="test@example.com",
            username="testuser",
            hashed_password="hashed_password",
            role=UserRole.USER,
            is_active=True
        )
        
        # Mock the database lookup to return our user
        mock_db.execute.return_value.scalars.return_value.first.return_value = existing_user
        
        # Mock the password verification to return False (invalid password)
        mock_verify.return_value = False
        
        # Test data
        login_data = {
            "username": "test@example.com",
            "password": "WrongPassword"
        }
        
        # Make the request
        response = client.post("/api/auth/token", data=login_data)
        
        # Check the response
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_nonexistent_user(client, async_test_session):
    """Test login with non-existent user."""
    with patch("src.routes.auth_routes.db") as mock_db:
        # Configure the mock to return our test session
        mock_db.return_value = async_test_session
        
        # Mock the database lookup to return None (user not found)
        mock_db.execute.return_value.scalars.return_value.first.return_value = None
        
        # Test data
        login_data = {
            "username": "nonexistent@example.com",
            "password": "AnyPassword"
        }
        
        # Make the request
        response = client.post("/api/auth/token", data=login_data)
        
        # Check the response
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user(client):
    """Test getting current user with valid token."""
    # Create a valid JWT token
    SECRET_KEY = "test_secret_key"
    ALGORITHM = "HS256"
    
    with patch("src.routes.auth_routes.SECRET_KEY", SECRET_KEY), \
         patch("src.routes.auth_routes.ALGORITHM", ALGORITHM), \
         patch("src.routes.auth_routes.get_user") as mock_get_user:
        
        # Test user data
        user_id = 1
        user_email = "test@example.com"
        
        # Create token payload
        expiration = datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
        payload = {
            "sub": str(user_id),
            "email": user_email,
            "exp": expiration
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        # Mock the get_user function
        mock_user = User(
            id=user_id,
            email=user_email,
            username="testuser",
            role=UserRole.USER,
            is_active=True
        )
        mock_get_user.return_value = mock_user
        
        # Make request with token
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        
        # Check the response
        assert response.status_code == 200
        user_data = response.json()
        
        assert user_data["id"] == user_id
        assert user_data["email"] == user_email
        assert user_data["role"] == "USER"

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
    
    with patch("src.routes.auth_routes.SECRET_KEY", SECRET_KEY), \
         patch("src.routes.auth_routes.ALGORITHM", ALGORITHM):
        
        # Create token payload with expiration in the past
        expiration = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        payload = {
            "sub": "1",
            "email": "test@example.com",
            "exp": expiration
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        # Make request with expired token
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        
        # Check the response
        assert response.status_code == 401
        assert "Token has expired" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user_missing_token(client):
    """Test getting current user without a token."""
    # Make request without token
    response = client.get("/api/auth/me")
    
    # Check the response
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"] 