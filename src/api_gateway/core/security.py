import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from api_gateway.core.config import settings
from api_gateway.core.database import get_db
from services.authentication.models import User

SALT_LEN_BYTES = 16


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SALT_LEN_BYTES)
    digest = hashlib.sha256(salt + password.encode("utf-8")).hexdigest()
    return f"sha256${salt.hex()}${digest}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        algo, salt_hex, stored_hex = hashed_password.split("$")
        if algo != "sha256":
            return False
        salt = bytes.fromhex(salt_hex)
        calc_hex = hashlib.sha256(salt + plain_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(calc_hex, stored_hex)
    except Exception:
        return False


def create_access_token(subject: str, expires_minutes: int = 60) -> str:
    """Create a signed JWT access token with subject in `sub`."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_minutes)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": secrets.token_hex(8),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        if subject is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == subject).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
