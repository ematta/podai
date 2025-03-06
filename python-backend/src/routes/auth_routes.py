from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Body
from fastapi.security import OAuth2PasswordRequestForm
from starlette.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta
import os
import logging

from src.models.database import get_db
from src.models.user import User, UserRole
from src.schemas.auth import Token, UserCreate, UserResponse, UserUpdate, UsersListResponse
from src.utils.auth import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_active_user, get_admin_user, get_user_by_email
)
from src.utils.google_auth import get_google_oauth_url, validate_google_token

# Use the application logger
from src.config.logger import setup_logger
logger = setup_logger("auth")

# Get frontend URL for redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")

# Initialize router
router = APIRouter()

# Superuser initialization
SUDO_EMAIL = os.getenv("SUDO_EMAIL", "admin@example.com")
SUDO_PASSWORD = os.getenv("SUDO_PASSWORD", "")
SUDO_USERNAME = os.getenv("SUDO_USERNAME", "Administrator")

# Startup event to create the superuser
@router.on_event("startup")
async def init_superuser():
    # Only create the superuser if SUDO_PASSWORD is set
    if not SUDO_PASSWORD:
        logger.warning("SUDO_PASSWORD environment variable is not set. Superuser will not be created.")
        return
        
    try:
        async with AsyncSession(get_db) as db:
            # Check if superuser already exists
            result = await db.execute(select(User).where(User.email == SUDO_EMAIL))
            superuser = result.scalars().first()
            
            if not superuser:
                # Create the superuser
                hashed_password = get_password_hash(SUDO_PASSWORD)
                superuser = User(
                    email=SUDO_EMAIL,
                    username=SUDO_USERNAME,
                    hashed_password=hashed_password,
                    role=UserRole.ADMIN,
                    is_superuser=True,
                    is_active=True
                )
                db.add(superuser)
                await db.commit()
                logger.info(f"Superuser created with email: {SUDO_EMAIL}")
            else:
                logger.info(f"Superuser already exists with email: {SUDO_EMAIL}")
    except Exception as e:
        logger.error(f"Failed to create superuser: {str(e)}")

# Token endpoint
@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and provide access token"""
    user = await authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    # Update last login time
    user.last_login = datetime.utcnow()
    await db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}

# User registration
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user with email and password"""
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email, db)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create the user
    hashed_password = get_password_hash(user_data.password) if user_data.password else None
    
    # If no password is provided, raise an error (for non-OAuth flow)
    if not hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for registration"
        )
    
    new_user = User(
        email=user_data.email,
        username=user_data.username or user_data.email.split('@')[0],
        hashed_password=hashed_password,
        role=UserRole.USER
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info(f"New user registered: {new_user.email}")
    return new_user

# User profile
@router.get("/me", response_model=UserResponse)
async def get_user_profile(current_user: User = Depends(get_current_active_user)):
    """Get the current user's profile"""
    return current_user

# Update user profile
@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the current user's profile"""
    # Users can only update certain fields of their own profile
    if user_data.username is not None:
        current_user.username = user_data.username
    
    # Email update requires verification (not implemented in this version)
    if user_data.email is not None and user_data.email != current_user.email:
        # Check if the new email already exists
        existing_user = await get_user_by_email(user_data.email, db)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_data.email
    
    await db.commit()
    return current_user

# Google OAuth routes
@router.get("/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    redirect_uri = get_google_oauth_url(request)
    return RedirectResponse(redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback"""
    user_info = await validate_google_token(request)
    if not user_info:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Authentication failed")
    
    google_id = user_info.get("sub")
    email = user_info.get("email")
    username = user_info.get("name") or email.split('@')[0]
    picture = user_info.get("picture")
    
    # Check if user already exists with this Google ID
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalars().first()
    
    if not user:
        # Check if user exists with this email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user:
            # Create a new user
            user = User(
                email=email,
                username=username,
                google_id=google_id,
                profile_picture=picture,
                role=UserRole.USER
            )
            db.add(user)
        else:
            # Link Google ID to existing user
            user.google_id = google_id
            user.profile_picture = picture
    
    # Update last login time
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    # Redirect to frontend with token
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={access_token}")

# Admin user management routes (protected)
@router.get("/users", response_model=UsersListResponse)
async def list_users(
    skip: int = 0, 
    limit: int = 100,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """List all users (admin only)"""
    users_result = await db.execute(select(User).offset(skip).limit(limit))
    count_result = await db.execute(select(func.count(User.id)))
    
    users = users_result.scalars().all()
    total = count_result.scalar_one()
    
    return {"users": users, "total": total}

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific user by ID (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a user (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update the user
    if user_data.username is not None:
        user.username = user_data.username
    
    if user_data.email is not None and user_data.email != user.email:
        # Check if the new email already exists
        existing_user = await get_user_by_email(user_data.email, db)
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = user_data.email
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.role is not None and user_data.role in [UserRole.ADMIN, UserRole.USER]:
        # Prevent changing a superuser's role
        if not user.is_superuser:
            user.role = user_data.role
    
    await db.commit()
    await db.refresh(user)
    
    return user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting a superuser
    if user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete a superuser"
        )
    
    await db.delete(user)
    await db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT) 