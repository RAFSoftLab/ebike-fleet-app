from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.authentication import schemas, service
from api_gateway.core.database import get_db
from api_gateway.core import security

router = APIRouter()

@router.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return service.create_user(db, user)


@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    return service.authenticate_user(db, user)


@router.get("/me/profile", response_model=schemas.UserProfileRead)
def read_my_profile(
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user),
):
    return service.get_user_profile(db, current_user.id)


@router.put("/me/profile", response_model=schemas.UserProfileRead)
def upsert_my_profile(
    profile: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user),
):
    return service.upsert_user_profile(db, current_user.id, profile)
