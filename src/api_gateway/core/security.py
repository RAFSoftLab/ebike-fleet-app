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
from services.authentication.models import User, RoleEnum
from typing import Set

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


def create_refresh_token(subject: str, jti: str, expires_days: int = 30) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=expires_days)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": jti,
        "typ": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("typ") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


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


def _admin_emails() -> Set[str]:
    if not settings.admin_emails_csv:
        return set()
    return {e.strip().lower() for e in settings.admin_emails_csv.split(",") if e.strip()}


def is_admin(user: User) -> bool:
    try:
        return getattr(user, "role", None) == RoleEnum.admin
    except Exception:
        return False


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user
