from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
import uuid
from api_gateway.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    password_hash = Column(String)
