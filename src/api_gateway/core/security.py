import hashlib
import hmac
import secrets

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
