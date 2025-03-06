from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from src.models.user import UserRole

class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Token data schema"""
    email: Optional[str] = None

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    username: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    """User creation schema"""
    password: Optional[str] = None
    role: Optional[str] = UserRole.USER

class UserCreateAdmin(UserCreate):
    """Admin creation of user with role"""
    role: str = UserRole.USER
    is_superuser: bool = False

class UserUpdate(BaseModel):
    """User update schema"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class UserInDB(UserBase):
    """User in database schema"""
    id: int
    role: str
    is_superuser: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserResponse(UserInDB):
    """User response schema (no sensitive data)"""
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True

class UsersListResponse(BaseModel):
    """List of users response"""
    users: List[UserResponse]
    total: int

class LoginForm(BaseModel):
    """Login form schema"""
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    """Change password request schema"""
    current_password: str
    new_password: str 