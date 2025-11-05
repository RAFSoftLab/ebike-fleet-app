import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt
from api_gateway.core.config import settings

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
