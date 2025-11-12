import os
import sys
import uuid
from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ensure `src/` is importable
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from api_gateway.core.config import settings
from api_gateway.core.database import Base, get_db
from api_gateway.main import app
from api_gateway.core import security
from services.authentication import models as auth_models


@pytest.fixture(scope="session")
def test_db_engine():
    """Create a dedicated PostgreSQL schema for tests and yield an engine bound to it."""
    database_url = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@db:5432/ebike_db",
    )
    schema = f"test_schema_{uuid.uuid4().hex[:8]}"

    # Create schema in the default db
    admin_engine = create_engine(database_url)
    with admin_engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))

    # Bind engine to that schema via connection options
    engine = create_engine(
        database_url,
        connect_args={"options": f"-csearch_path={schema}"},
        future=True,
    )

    # Create all tables for this metadata in the schema
    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        # Drop the schema and everything in it
        with admin_engine.begin() as conn:
            conn.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
        admin_engine.dispose()
        engine.dispose()


@pytest.fixture(scope="session")
def TestingSessionLocal(test_db_engine):
    return sessionmaker(bind=test_db_engine, autoflush=False, autocommit=False)


@contextmanager
def _test_db_session(SessionLocal):
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def configure_settings_for_tests():
    settings.jwt_secret = os.getenv("TEST_JWT_SECRET", "testsecret")
    settings.jwt_algorithm = os.getenv("TEST_JWT_ALG", "HS256")
    settings.admin_emails_csv = os.getenv("TEST_ADMIN_EMAILS", "admin@example.com")
    yield


@pytest.fixture(scope="session")
def app_with_overrides(TestingSessionLocal):
    # Override dependency to use the test session
    def _override_get_db():
        with _test_db_session(TestingSessionLocal) as db:
            yield db

    app.dependency_overrides[get_db] = _override_get_db
    return app


@pytest.fixture()
def client(app_with_overrides):
    return TestClient(app_with_overrides)


@pytest.fixture()
def db_session(TestingSessionLocal):
    with _test_db_session(TestingSessionLocal) as db:
        yield db


@pytest.fixture()
def create_user(db_session):
    def _create_user(username: str, email: str, password: str = "password"):
        password_hash = security.hash_password(password)
        user = auth_models.User(username=username, email=email, password_hash=password_hash)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create_user


@pytest.fixture()
def admin_auth_header(create_user, db_session):
    admin_email = "admin@example.com"
    user = create_user("admin", admin_email)
    # Ensure this user has admin role for tests
    from services.authentication.models import RoleEnum  # local import to avoid circulars
    user.role = RoleEnum.admin  # type: ignore
    db_session.commit()
    token = security.create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_auth_header(create_user, db_session):
    # Create a non-admin user and attach a profile
    user = create_user("rider", "rider@example.com")
    profile = auth_models.UserProfile(user_id=user.id)
    db_session.add(profile)
    db_session.commit()
    token = security.create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}



