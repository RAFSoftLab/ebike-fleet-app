from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from sqlalchemy import or_
from api_gateway.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from . import models, schemas
from uuid import UUID
import secrets
from datetime import datetime, timedelta, timezone

def create_user(db: Session, user: schemas.UserCreate):
    """
    Create a new user in the database.
    Check if the username or email already exists.
    If it does, raise an error.
    If it doesn't, hash the password and create the user.
    """
    existing = (
        db.query(models.User)
        .filter(
            or_(
                models.User.username == user.username,
                models.User.email == user.email,
            )
        )
        .first()
    )
    if existing:
        if existing.username == user.username:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
        if existing.email == user.email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    hashed_pw = hash_password(user.password)
    # If there are no admins yet, make this user an admin to bootstrap the system
    try:
        has_admin = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).count() > 0
    except Exception:
        has_admin = False
    role = models.RoleEnum.admin if not has_admin else models.RoleEnum.driver
    db_user = models.User(username=user.username, email=user.email, password_hash=hashed_pw, role=role)
    db.add(db_user)
    try:
        # Obtain ID without finalizing the transaction
        db.flush()
        # Create an empty profile immediately for the new user
        profile = models.UserProfile(user_id=db_user.id)
        db.add(profile)
        # Finalize both inserts atomically
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with given username or email already exists")
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, login: schemas.UserLogin):
    """
    Authenticate a user by username or email and return a JWT token on success.
    """
    identifier = login.identifier
    user = (
        db.query(models.User)
        .filter(or_(models.User.username == identifier, models.User.email == identifier))
        .first()
    )
    if not user or not verify_password(login.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return schemas.Token(access_token=token), user


def _create_refresh_record_and_token(db: Session, user_id: UUID, days: int = 30):
    now = datetime.now(timezone.utc)
    jti = secrets.token_hex(16)
    expires_at = now + timedelta(days=days)

    record = models.RefreshToken(
        jti=jti,
        user_id=user_id,
        revoked=False,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    refresh_jwt = create_refresh_token(str(user_id), jti, expires_days=days)
    max_age = int((expires_at - now).total_seconds())
    return refresh_jwt, max_age


def mint_refresh_token(db: Session, user_id: UUID):
    return _create_refresh_record_and_token(db, user_id)


def refresh_access(db: Session, refresh_token: str):
    payload = decode_refresh_token(refresh_token)
    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    record = (
        db.query(models.RefreshToken)
        .filter(models.RefreshToken.jti == jti)
        .first()
    )
    if not record or record.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked or not found")
    now = datetime.now(timezone.utc)
    if record.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    # rotate: revoke old, create new
    record.revoked = True
    new_refresh_jwt, max_age = _create_refresh_record_and_token(db, UUID(sub))
    # set linkage
    new_payload = decode_refresh_token(new_refresh_jwt)
    record.replaced_by = new_payload.get("jti")
    db.commit()

    access = create_access_token(sub)
    return schemas.Token(access_token=access), new_refresh_jwt, max_age


def logout(db: Session, refresh_token: str):
    try:
        payload = decode_refresh_token(refresh_token)
    except HTTPException:
        return
    jti = payload.get("jti")
    if not jti:
        return
    record = (
        db.query(models.RefreshToken)
        .filter(models.RefreshToken.jti == jti)
        .first()
    )
    if not record:
        return
    record.revoked = True
    db.commit()


def get_user_profile(db: Session, user_id: UUID):
    profile = (
        db.query(models.UserProfile)
        .filter(models.UserProfile.user_id == user_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


def upsert_user_profile(db: Session, user_id: UUID, update: schemas.UserProfileUpdate):
    profile = (
        db.query(models.UserProfile)
        .filter(models.UserProfile.user_id == user_id)
        .first()
    )
    if not profile:
        profile = models.UserProfile(user_id=user_id)
        db.add(profile)

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


def set_user_role_by_id(db: Session, user_id: UUID, role: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        user.role = models.RoleEnum(role)  # type: ignore
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    db.commit()
    db.refresh(user)
    return user


def set_user_role_by_email(db: Session, email: str, role: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        user.role = models.RoleEnum(role)  # type: ignore
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    db.commit()
    db.refresh(user)
    return user


def bootstrap_admin(db: Session, user_id: UUID):
    # Only allow bootstrap if there are no admins in the system yet
    has_admin = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).count() > 0
    if has_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin already exists")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = models.RoleEnum.admin
    db.commit()
    db.refresh(user)
    return user
