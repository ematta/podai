from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, func
from sqlalchemy.sql import expression
import enum
from datetime import datetime
from .database import Base

class UserRole(str, enum.Enum):
    """Enum for user roles"""
    ADMIN = "admin"
    USER = "user"

class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, index=True)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True, index=True)
    profile_picture = Column(String, nullable=True)
    
    # User role
    role = Column(String, default=UserRole.USER)
    
    # Account status
    is_active = Column(Boolean, default=True, server_default=expression.true())
    is_superuser = Column(Boolean, default=False, server_default=expression.false())
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<User {self.email}>" 