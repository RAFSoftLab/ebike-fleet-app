from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from sqlalchemy import or_
from api_gateway.core.security import hash_password, verify_password, create_access_token
from . import models, schemas

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
    db_user = models.User(username=user.username, email=user.email, password_hash=hashed_pw)
    db.add(db_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with given username or email already exists")
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, login: schemas.UserLogin) -> schemas.Token:
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
    return schemas.Token(access_token=token)
