from fastapi import APIRouter, Depends, Response, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date
from typing import Optional
from api_gateway.core.database import get_db
from api_gateway.core import security
from services.fleet import schemas, service
from services.fleet import models as fleet_models
from services.authentication import models as auth_models
from services.authentication import schemas as auth_schemas
from services.authentication import service as auth_service

router = APIRouter()

@router.get("/drivers", response_model=list[auth_schemas.UserProfileWithRoleRead])
def list_drivers(
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    rows = service.list_driver_profiles(db)
    results: list[auth_schemas.UserProfileWithRoleRead] = []
    for user, profile in rows:
        base = auth_schemas.UserProfileRead.model_validate(profile).model_dump()
        payload = {**base, "role": getattr(getattr(user, "role", None), "value", "driver")}
        results.append(auth_schemas.UserProfileWithRoleRead.model_validate(payload))
    return results

@router.post("/drivers", response_model=auth_schemas.UserProfileWithRoleRead, status_code=status.HTTP_201_CREATED)
def create_driver(
    payload: auth_schemas.AdminCreateDriver,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    """
    Admin-only endpoint to create a new driver user and optionally set their profile details.
    """
    # Create the user
    user = auth_service.create_user(
        db,
        auth_schemas.UserCreate(username=payload.username, email=payload.email, password=payload.password),
    )
    # Ensure role is driver explicitly
    if getattr(user, "role", None) != auth_models.RoleEnum.driver:
        user = auth_service.set_user_role_by_id(db, user.id, "driver")
    # Upsert profile details if provided
    profile_update = auth_schemas.UserProfileUpdate(
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone_number=payload.phone_number,
        address_line=payload.address_line,
    )
    profile = auth_service.upsert_user_profile(db, user.id, profile_update)
    # Return the profile with the role
    resp = {**auth_schemas.UserProfileRead.model_validate(profile).model_dump(), "role": "driver"}
    return auth_schemas.UserProfileWithRoleRead.model_validate(resp)

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


# Rentals
@router.post("/rentals", response_model=schemas.RentalRead, status_code=status.HTTP_201_CREATED)
def create_rental(
    rental: schemas.RentalCreate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    """Create a new rental. Admin only."""
    return service.create_rental(db, rental)


@router.get("/rentals", response_model=list[schemas.RentalRead])
def list_rentals(
    bike_id: Optional[UUID] = Query(None, description="Filter by bike ID"),
    profile_id: Optional[UUID] = Query(None, description="Filter by driver profile ID"),
    start_date: Optional[date] = Query(None, description="Filter rentals that overlap with this date or later"),
    end_date: Optional[date] = Query(None, description="Filter rentals that overlap with this date or earlier"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user = Depends(security.get_current_user),
):
    """
    List rentals with optional filters.
    Admins can see all rentals. Drivers can only see their own rentals.
    """
    # Drivers can only see their own rentals
    if not security.is_admin(user):
        profile = db.query(auth_models.UserProfile).filter(auth_models.UserProfile.user_id == user.id).first()
        if not profile:
            return []
        # Override profile_id filter for drivers
        profile_id = profile.id
    
    return service.list_rentals(
        db,
        bike_id=bike_id,
        profile_id=profile_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )


@router.get("/rentals/{rental_id}", response_model=schemas.RentalRead)
def get_rental(
    rental_id: UUID,
    db: Session = Depends(get_db),
    user = Depends(security.get_current_user),
):
    """Get a rental by ID. Admins can see any rental. Drivers can only see their own."""
    rental = service.get_rental(db, rental_id)
    
    # Drivers can only see their own rentals
    if not security.is_admin(user):
        profile = db.query(auth_models.UserProfile).filter(auth_models.UserProfile.user_id == user.id).first()
        if not profile or rental.profile_id != profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this rental")
    
    return rental


@router.put("/rentals/{rental_id}", response_model=schemas.RentalRead)
def update_rental(
    rental_id: UUID,
    update: schemas.RentalUpdate,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    """Update a rental. Admin only."""
    return service.update_rental(db, rental_id, update)


@router.delete("/rentals/{rental_id}", status_code=204)
def delete_rental(
    rental_id: UUID,
    db: Session = Depends(get_db),
    _admin = Depends(security.require_admin),
):
    """Delete a rental. Admin only."""
    service.delete_rental(db, rental_id)
    return Response(status_code=204)


