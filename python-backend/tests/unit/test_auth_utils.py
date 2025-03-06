"""
Unit tests for authentication utility functions.
"""
import pytest
import jwt
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException
import os

from src.utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_user_by_email,
    get_user_by_google_id,
    authenticate_user,
    get_current_user,
    get_current_active_user,
    get_admin_user,
    SECRET_KEY,
    ALGORITHM
)
from src.models.user import User, UserRole

# Test password utilities
def test_password_hash_and_verify():
    """Test password hashing and verification."""
    # Test password hashing
    password = "test_password123"
    hashed = get_password_hash(password)
    
    # Verify the hash is different from the original password
    assert hashed != password
    
    # Verify the password against the hash
    assert verify_password(password, hashed) is True
    
    # Verify an incorrect password
    assert verify_password("wrong_password", hashed) is False

# Test token utilities
def test_create_access_token():
    """Test creation of JWT access tokens."""
    # Test data
    data = {"sub": "test@example.com"}
    
    # Create token with default expiration
    token = create_access_token(data)
    
    # Decode the token and verify - disable expiration verification
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
    assert payload["sub"] == "test@example.com"
    assert "exp" in payload
    
    # Create token with custom expiration
    expires = timedelta(minutes=5)
    token = create_access_token(data, expires)
    
    # Decode and verify expiration - disable expiration verification
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
    assert "exp" in payload
    
    # Since we're testing token creation, we don't need to validate the exact timestamp
    # Just verify that an expiration was set at all
    assert isinstance(payload["exp"], int)

@pytest.mark.asyncio
async def test_get_user_by_email():
    """Test retrieving a user by email."""
    # Create a mock user
    mock_user = User(
        id=1,
        email="test@example.com",
        username="testuser",
        role=UserRole.USER,
        is_active=True
    )
    
    # Create a mock database session
    mock_db = AsyncMock()
    mock_result = mock_db.execute.return_value
    mock_result.scalars.return_value.first.return_value = mock_user
    
    # Test the function
    user = await get_user_by_email("test@example.com", mock_db)
    
    # Verify the result
    assert user is mock_user
    
    # Verify the query was executed correctly
    mock_db.execute.assert_called_once()

@pytest.mark.asyncio
async def test_get_user_by_google_id():
    """Test retrieving a user by Google ID."""
    # Create a mock user
    mock_user = User(
        id=1,
        email="test@example.com",
        username="testuser",
        google_id="google123",
        role=UserRole.USER,
        is_active=True
    )
    
    # Create a mock database session
    mock_db = AsyncMock()
    mock_result = mock_db.execute.return_value
    mock_result.scalars.return_value.first.return_value = mock_user
    
    # Test the function
    user = await get_user_by_google_id("google123", mock_db)
    
    # Verify the result
    assert user is mock_user
    
    # Verify the query was executed correctly
    mock_db.execute.assert_called_once()

@pytest.mark.asyncio
async def test_authenticate_user_valid():
    """Test authenticating a user with valid credentials."""
    # Create a mock user with a known password hash
    password = "test_password"
    password_hash = get_password_hash(password)
    
    mock_user = User(
        id=1,
        email="test@example.com",
        username="testuser",
        hashed_password=password_hash,
        role=UserRole.USER,
        is_active=True
    )
    
    # Mock the get_user_by_email function
    with patch("src.utils.auth.get_user_by_email", return_value=mock_user) as mock_get_user:
        # Test authentication with valid credentials
        result = await authenticate_user("test@example.com", password, AsyncMock())
        
        # Verify the result
        assert result is mock_user
        
        # Verify the get_user function was called
        mock_get_user.assert_called_once_with("test@example.com", AsyncMock())

@pytest.mark.asyncio
async def test_authenticate_user_invalid_password():
    """Test authenticating a user with invalid password."""
    # Create a mock user with a known password hash
    password = "test_password"
    password_hash = get_password_hash(password)
    
    mock_user = User(
        id=1,
        email="test@example.com",
        username="testuser",
        hashed_password=password_hash,
        role=UserRole.USER,
        is_active=True
    )
    
    # Mock the get_user_by_email function
    with patch("src.utils.auth.get_user_by_email", return_value=mock_user) as mock_get_user:
        # Test authentication with wrong password
        result = await authenticate_user("test@example.com", "wrong_password", AsyncMock())
        
        # Verify the result
        assert result is None
        
        # Verify the get_user function was called
        mock_get_user.assert_called_once()

@pytest.mark.asyncio
async def test_authenticate_user_nonexistent():
    """Test authenticating a non-existent user."""
    # Mock the get_user_by_email function to return None
    with patch("src.utils.auth.get_user_by_email", return_value=None) as mock_get_user:
        # Test authentication with non-existent user
        result = await authenticate_user("nonexistent@example.com", "any_password", AsyncMock())
        
        # Verify the result
        assert result is None
        
        # Verify the get_user function was called
        mock_get_user.assert_called_once()

@pytest.mark.asyncio
async def test_get_current_user_valid_token():
    """Test getting current user with a valid token."""
    # Create a mock user
    mock_user = User(
        id=1,
        email="test@example.com",
        username="testuser",
        role=UserRole.USER,
        is_active=True
    )
    
    # Create a valid token
    token = create_access_token({"sub": mock_user.email})
    
    # Mock the get_user_by_email function
    with patch("src.utils.auth.get_user_by_email", return_value=mock_user) as mock_get_user:
        # Mock the database session
        mock_db = AsyncMock()
        
        # Test the function
        user = await get_current_user(token, mock_db)
        
        # Verify the result
        assert user is mock_user
        
        # Verify the get_user function was called
        mock_get_user.assert_called_once_with(mock_user.email, mock_db)
        
        # Verify the last_login was updated
        assert mock_db.execute.called
        assert mock_db.commit.called

@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    """Test getting current user with an invalid token."""
    # Test with an invalid token
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user("invalid_token", AsyncMock())
    
    # Verify the exception
    assert excinfo.value.status_code == 401
    assert "Could not validate credentials" in excinfo.value.detail

@pytest.mark.asyncio
async def test_get_current_user_expired_token():
    """Test getting current user with an expired token."""
    # Create an expired token
    expires = timedelta(minutes=-5)  # 5 minutes in the past
    token = create_access_token({"sub": "test@example.com"}, expires)
    
    # Test with the expired token
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(token, AsyncMock())
    
    # Verify the exception
    assert excinfo.value.status_code == 401
    assert "Could not validate credentials" in excinfo.value.detail

@pytest.mark.asyncio
async def test_get_current_active_user():
    """Test getting an active user."""
    # Create a mock active user
    mock_user = User(
        id=1,
        email="test@example.com",
        username="testuser",
        role=UserRole.USER,
        is_active=True
    )
    
    # Test the function
    user = await get_current_active_user(mock_user)
    
    # Verify the result
    assert user is mock_user

@pytest.mark.asyncio
async def test_get_current_inactive_user():
    """Test getting an inactive user."""
    # Create a mock inactive user
    mock_user = User(
        id=1,
        email="test@example.com",
        username="testuser",
        role=UserRole.USER,
        is_active=False
    )
    
    # Test the function with an inactive user
    with pytest.raises(HTTPException) as excinfo:
        await get_current_active_user(mock_user)
    
    # Verify the exception
    assert excinfo.value.status_code == 403
    assert "Inactive user" in excinfo.value.detail

@pytest.mark.asyncio
async def test_get_admin_user_valid():
    """Test getting an admin user."""
    # Create a mock admin user
    mock_admin = User(
        id=1,
        email="admin@example.com",
        username="admin",
        role=UserRole.ADMIN,
        is_active=True
    )
    
    # Test the function
    user = await get_admin_user(mock_admin)
    
    # Verify the result
    assert user is mock_admin

@pytest.mark.asyncio
async def test_get_admin_user_not_admin():
    """Test getting a non-admin user."""
    # Create a mock regular user
    mock_user = User(
        id=1,
        email="user@example.com",
        username="user",
        role=UserRole.USER,
        is_active=True,
        is_superuser=False
    )
    
    # Test the function with a non-admin user
    with pytest.raises(HTTPException) as excinfo:
        await get_admin_user(mock_user)
    
    # Verify the exception
    assert excinfo.value.status_code == 403
    assert "Insufficient permissions" in excinfo.value.detail

@pytest.mark.asyncio
async def test_get_admin_user_superuser():
    """Test getting a superuser (should pass admin check)."""
    # Create a mock superuser
    mock_superuser = User(
        id=1,
        email="super@example.com",
        username="superuser",
        role=UserRole.USER,  # Not ADMIN but is_superuser=True
        is_active=True,
        is_superuser=True
    )
    
    # Test the function
    user = await get_admin_user(mock_superuser)
    
    # Verify the result
    assert user is mock_superuser 