from fastapi import APIRouter, Depends, Response, Cookie, HTTPException, status
from sqlalchemy.orm import Session
from services.authentication import schemas, service
from api_gateway.core.database import get_db
from api_gateway.core import security

router = APIRouter()

@router.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return service.create_user(db, user)


@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, response: Response, db: Session = Depends(get_db)):
    token, user_obj = service.authenticate_user(db, user)
    refresh_jwt, max_age = service.mint_refresh_token(db, user_obj.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_jwt,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return token


@router.post("/refresh", response_model=schemas.Token)
def refresh(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    token, new_refresh, max_age = service.refresh_access(db, refresh_token)
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return token


@router.post("/logout", status_code=204)
def logout(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if refresh_token:
        service.logout(db, refresh_token)
    response.delete_cookie(key="refresh_token", path="/")
    return Response(status_code=204)


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
