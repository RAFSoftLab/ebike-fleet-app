from fastapi import APIRouter, Depends, Response, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from api_gateway.core.database import get_db
from api_gateway.core import security
from services.fleet import schemas, service
from services.fleet import models as fleet_models
from services.authentication import models as auth_models

router = APIRouter()

@router.get("/bike-statuses", response_model=list[str])
def bike_statuses(_user = Depends(security.get_current_user)):
    return [s.value for s in fleet_models.BikeStatus]


# Bikes
@router.post("/bikes", response_model=schemas.BikeRead)
def create_bike(
    bike: schemas.BikeCreate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.create_bike(db, bike)


@router.get("/bikes", response_model=list[schemas.BikeRead])
def list_bikes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user = Depends(security.get_current_user),
):
    # admins can list all bikes, riders can list their own bikes
    if security.is_admin(user):
        return service.list_bikes(db, skip=skip, limit=limit)
    profile = db.query(auth_models.UserProfile).filter(auth_models.UserProfile.user_id == user.id).first()
    if not profile:
        return []
    return service.list_bikes_for_profile(db, profile.id, skip=skip, limit=limit)


@router.get("/bikes/{bike_id}", response_model=schemas.BikeRead)
def get_bike(
    bike_id: UUID,
    db: Session = Depends(get_db),
    user = Depends(security.get_current_user),
):
    bike = service.get_bike(db, bike_id)
    if security.is_admin(user):
        return bike
    profile = getattr(user, "profile", None)
    if not profile or bike.assigned_profile_id != profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this bike")
    return bike


@router.put("/bikes/{bike_id}", response_model=schemas.BikeRead)
def update_bike(
    bike_id: UUID,
    update: schemas.BikeUpdate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.update_bike(db, bike_id, update)


@router.delete("/bikes/{bike_id}", status_code=204)
def delete_bike(
    bike_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    service.delete_bike(db, bike_id)
    return Response(status_code=204)


@router.post("/bikes/{bike_id}/assign-profile/{profile_id}", response_model=schemas.BikeRead)
def assign_bike_to_profile(
    bike_id: UUID,
    profile_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.assign_bike_to_profile(db, bike_id, profile_id)


@router.post("/bikes/{bike_id}/unassign-profile", response_model=schemas.BikeRead)
def unassign_bike_from_profile(
    bike_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.unassign_bike_from_profile(db, bike_id)


# Batteries
@router.post("/batteries", response_model=schemas.BatteryRead)
def create_battery(
    battery: schemas.BatteryCreate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.create_battery(db, battery)


@router.get("/batteries", response_model=list[schemas.BatteryRead])
def list_batteries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user = Depends(security.get_current_user),
):
    # admins can list all batteries, riders can list their own batteries
    if security.is_admin(user):
        return service.list_batteries(db, skip=skip, limit=limit)
    profile = db.query(auth_models.UserProfile).filter(auth_models.UserProfile.user_id == user.id).first()
    if not profile:
        return []
    return service.list_batteries_for_profile(db, profile.id, skip=skip, limit=limit)


@router.get("/me/bikes", response_model=list[schemas.BikeWithBatteriesRead])
def list_my_bikes_with_batteries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user = Depends(security.get_current_user),
):
    # admins can see everything; riders only their own
    if security.is_admin(user):
        return service.list_all_bikes_with_batteries(db, skip=skip, limit=limit)
    profile = db.query(auth_models.UserProfile).filter(auth_models.UserProfile.user_id == user.id).first()
    if not profile:
        return []
    return service.list_bikes_with_batteries_for_profile(db, profile.id, skip=skip, limit=limit)


@router.get("/batteries/{battery_id}", response_model=schemas.BatteryRead)
def get_battery(
    battery_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.get_battery(db, battery_id)


@router.put("/batteries/{battery_id}", response_model=schemas.BatteryRead)
def update_battery(
    battery_id: UUID,
    update: schemas.BatteryUpdate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.update_battery(db, battery_id, update)


@router.delete("/batteries/{battery_id}", status_code=204)
def delete_battery(
    battery_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    service.delete_battery(db, battery_id)
    return Response(status_code=204)


@router.post("/bikes/{bike_id}/assign-battery/{battery_id}", response_model=schemas.BatteryRead)
def assign_battery(
    bike_id: UUID,
    battery_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.assign_battery_to_bike(db, bike_id, battery_id)


@router.post("/bikes/{bike_id}/unassign-battery/{battery_id}", response_model=schemas.BatteryRead)
def unassign_battery(
    bike_id: UUID,
    battery_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    return service.unassign_battery_from_bike(db, bike_id, battery_id)


