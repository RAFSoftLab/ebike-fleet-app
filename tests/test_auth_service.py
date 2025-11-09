import pytest
from sqlalchemy.orm import Session

from services.authentication import service as auth_service
from services.authentication import schemas as auth_schemas


def test_create_user_and_duplicate(db_session: Session):
    user_in = auth_schemas.UserCreate(username="u1", email="u1@example.com", password="pw")
    created = auth_service.create_user(db_session, user_in)
    assert created.username == "u1"
    assert created.email == "u1@example.com"

    # Duplicate username
    with pytest.raises(Exception):
        auth_service.create_user(
            db_session,
            auth_schemas.UserCreate(username="u1", email="another@example.com", password="pw"),
        )

    # Duplicate email
    with pytest.raises(Exception):
        auth_service.create_user(
            db_session,
            auth_schemas.UserCreate(username="another", email="u1@example.com", password="pw"),
        )


def test_authenticate_user(db_session: Session):
    # Create user
    created = auth_service.create_user(
        db_session,
        auth_schemas.UserCreate(username="loginuser", email="login@example.com", password="pw"),
    )
    token, user = auth_service.authenticate_user(
        db_session, auth_schemas.UserLogin(identifier="loginuser", password="pw")
    )
    assert token.access_token
    assert user.id == created.id

    # Wrong password
    with pytest.raises(Exception):
        auth_service.authenticate_user(
            db_session, auth_schemas.UserLogin(identifier="loginuser", password="bad")
        )



