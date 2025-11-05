from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.authentication import schemas, service
from api_gateway.core.database import get_db

router = APIRouter()

@router.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return service.create_user(db, user)


@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    return service.authenticate_user(db, user)
