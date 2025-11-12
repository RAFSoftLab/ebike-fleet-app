from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from typing import Optional, Literal

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class AdminCreateDriver(BaseModel):
    username: str
    email: EmailStr
    password: str
    # Set profile fields, at creation
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    address_line: Optional[str] = None

class UserRead(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    identifier: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfileBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    address_line: Optional[str] = None


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileRead(UserProfileBase):
    id: UUID
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)


class UserProfileWithRoleRead(UserProfileRead):
    role: Literal["admin", "driver"]


class RoleUpdate(BaseModel):
    role: Literal["admin", "driver"]
