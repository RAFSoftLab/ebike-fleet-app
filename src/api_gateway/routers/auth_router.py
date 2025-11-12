from fastapi import APIRouter, Depends, Response, Cookie, HTTPException, status
from sqlalchemy.orm import Session
from services.authentication import schemas, service
from api_gateway.core.database import get_db
from api_gateway.core import security
from uuid import UUID

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


@router.get("/me/profile", response_model=schemas.UserProfileWithRoleRead)
def read_my_profile(
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user),
):
    profile = service.get_user_profile(db, current_user.id)
    return {
        **schemas.UserProfileRead.model_validate(profile).model_dump(),
        "role": getattr(getattr(current_user, "role", None), "value", "driver"),
    }


@router.put("/me/profile", response_model=schemas.UserProfileRead)
def upsert_my_profile(
    profile: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user),
):
    return service.upsert_user_profile(db, current_user.id, profile)

@router.post("/bootstrap-admin", response_model=schemas.UserRead)
def bootstrap_admin(
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_user),
):
    """
    Promote the current authenticated user to admin IF AND ONLY IF
    there are no admins in the system yet. Otherwise return 403.
    """
    user = service.bootstrap_admin(db, current_user.id)
    return schemas.UserRead.model_validate(user)


@router.put("/users/{user_id}/role", response_model=schemas.UserRead)
def set_user_role_by_id(
    user_id: UUID,
    update: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    user = service.set_user_role_by_id(db, user_id, update.role)
    return schemas.UserRead.model_validate(user)


@router.put("/users/by-email/{email}/role", response_model=schemas.UserRead)
def set_user_role_by_email(
    email: str,
    update: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    user = service.set_user_role_by_email(db, email, update.role)
    return schemas.UserRead.model_validate(user)
