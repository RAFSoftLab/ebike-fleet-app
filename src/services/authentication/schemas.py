from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: UUID
    username: str
    email: EmailStr

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True
