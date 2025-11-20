from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from uuid import UUID
from . import models, schemas
from typing import List, Tuple, Optional
from datetime import date
from services.authentication import models as auth_models


# Bikes
def create_bike(db: Session, data: schemas.BikeCreate):
    bike = models.Bike(
        serial_number=data.serial_number,
        serial_number_ci=data.serial_number.lower(),
        make=data.make,
        model=data.model,
        status=models.BikeStatus[data.status] if isinstance(data.status, str) else data.status,
        mileage=data.mileage or 0,
        last_service_at=data.last_service_at,
        assigned_profile_id=data.assigned_profile_id,
    )
    db.add(bike)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bike with given serial_number exists")
    db.refresh(bike)
    return bike


def list_bikes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Bike).offset(skip).limit(limit).all()


def list_bikes_for_profile(db: Session, profile_id: UUID, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Bike)
        .filter(models.Bike.assigned_profile_id == profile_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_bike(db: Session, bike_id: UUID):
    bike = db.query(models.Bike).filter(models.Bike.id == bike_id).first()
    if not bike:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bike not found")
    return bike


def update_bike(db: Session, bike_id: UUID, update: schemas.BikeUpdate):
    bike = get_bike(db, bike_id)
    update_data = update.model_dump(exclude_unset=True)
    if "status" in update_data and isinstance(update_data["status"], str):
        update_data["status"] = models.BikeStatus[update_data["status"]]
    for key, value in update_data.items():
        setattr(bike, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflict updating bike")
    db.refresh(bike)
    return bike


def delete_bike(db: Session, bike_id: UUID):
    bike = get_bike(db, bike_id)
    db.delete(bike)
    db.commit()


def assign_bike_to_profile(db: Session, bike_id: UUID, profile_id: UUID):
    bike = get_bike(db, bike_id)
    profile = (
        db.query(auth_models.UserProfile)
        .filter(auth_models.UserProfile.id == profile_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    bike.assigned_profile_id = profile.id
    bike.status = models.BikeStatus.assigned
    db.commit()
    db.refresh(bike)
    return bike


def unassign_bike_from_profile(db: Session, bike_id: UUID):
    bike = get_bike(db, bike_id)
    bike.assigned_profile_id = None
    bike.status = models.BikeStatus.available
    db.commit()
    db.refresh(bike)
    return bike


# Batteries
def create_battery(db: Session, data: schemas.BatteryCreate):
    battery = models.Battery(
        serial_number=data.serial_number,
        capacity_wh=data.capacity_wh,
        charge_level=data.charge_level or 100,
        cycle_count=data.cycle_count or 0,
        health_status=models.BatteryHealth[data.health_status] if isinstance(data.health_status, str) else data.health_status,
        status=models.BatteryStatus[data.status] if isinstance(data.status, str) else data.status,
        last_service_at=data.last_service_at,
        assigned_bike_id=data.assigned_bike_id,
    )
    db.add(battery)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Battery with given serial_number exists")
    db.refresh(battery)
    return battery


def list_batteries(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Battery).offset(skip).limit(limit).all()


def list_batteries_for_profile(db: Session, profile_id: UUID, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Battery)
        .join(models.Bike, models.Battery.assigned_bike_id == models.Bike.id)
        .filter(models.Bike.assigned_profile_id == profile_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_battery(db: Session, battery_id: UUID):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Battery not found")
    return battery


def update_battery(db: Session, battery_id: UUID, update: schemas.BatteryUpdate):
    battery = get_battery(db, battery_id)
    update_data = update.model_dump(exclude_unset=True)
    if "status" in update_data and isinstance(update_data["status"], str):
        update_data["status"] = models.BatteryStatus[update_data["status"]]
    if "health_status" in update_data and isinstance(update_data["health_status"], str):
        update_data["health_status"] = models.BatteryHealth[update_data["health_status"]]
    for key, value in update_data.items():
        setattr(battery, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflict updating battery")
    db.refresh(battery)
    return battery


def delete_battery(db: Session, battery_id: UUID):
    battery = get_battery(db, battery_id)
    db.delete(battery)
    db.commit()


def assign_battery_to_bike(db: Session, bike_id: UUID, battery_id: UUID):
    bike = get_bike(db, bike_id)
    battery = get_battery(db, battery_id)
    battery.assigned_bike_id = bike.id
    battery.status = models.BatteryStatus.assigned
    db.commit()
    db.refresh(battery)
    return battery


def list_bikes_with_batteries_for_profile(db: Session, profile_id: UUID, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Bike)
        .options(joinedload(models.Bike.batteries))
        .filter(models.Bike.assigned_profile_id == profile_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def list_all_bikes_with_batteries(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Bike)
        .options(joinedload(models.Bike.batteries))
        .offset(skip)
        .limit(limit)
        .all()
    )


def unassign_battery_from_bike(db: Session, bike_id: UUID, battery_id: UUID):
    bike = get_bike(db, bike_id)
    battery = get_battery(db, battery_id)
    if battery.assigned_bike_id != bike.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Battery not assigned to this bike")
    battery.assigned_bike_id = None
    battery.status = models.BatteryStatus.available
    db.commit()
    db.refresh(battery)
    return battery


def list_driver_profiles(db: Session) -> List[Tuple[auth_models.User, auth_models.UserProfile]]:
    """
    Return (User, UserProfile) rows for all users with the driver role
    that have an associated profile.
    """
    rows: List[Tuple[auth_models.User, auth_models.UserProfile]] = (
        db.query(auth_models.User, auth_models.UserProfile)
        .join(auth_models.UserProfile, auth_models.UserProfile.user_id == auth_models.User.id)
        .filter(auth_models.User.role == auth_models.RoleEnum.driver)
        .all()
    )
    return rows


# Rentals
def check_rental_conflicts(
    db: Session,
    bike_id: UUID,
    start_date: date,
    end_date: Optional[date],
    exclude_rental_id: Optional[UUID] = None
) -> bool:
    """
    Check if there are any overlapping rentals for the given bike and date range.
    Returns True if conflicts exist, False otherwise.
    
    Two rentals overlap if:
    - Rental A starts before Rental B ends AND Rental A ends after Rental B starts
    - For rentals without end_date, they are considered ongoing and overlap with any future date
    """
    query = db.query(models.Rental).filter(
        models.Rental.bike_id == bike_id
    )
    
    if exclude_rental_id:
        query = query.filter(models.Rental.id != exclude_rental_id)
    
    # Check for overlaps
    # Case 1: New rental has end_date
    if end_date:
        # Overlap conditions:
        # - Existing rental starts before new rental ends AND
        #   (existing rental has no end_date OR existing rental ends after new rental starts)
        conflicts = query.filter(
            and_(
                models.Rental.start_date <= end_date,
                or_(
                    models.Rental.end_date.is_(None),
                    models.Rental.end_date >= start_date
                )
            )
        ).first()
    else:
        # Case 2: New rental has no end_date (ongoing)
        # Overlaps with any rental that hasn't ended yet or has no end_date
        conflicts = query.filter(
            or_(
                models.Rental.end_date.is_(None),
                models.Rental.end_date >= start_date
            )
        ).first()
    
    return conflicts is not None


def create_rental(db: Session, data: schemas.RentalCreate):
    """Create a new rental, checking for conflicts."""
    # Verify bike exists
    bike = get_bike(db, data.bike_id)
    
    # Verify profile exists
    profile = (
        db.query(auth_models.UserProfile)
        .filter(auth_models.UserProfile.id == data.profile_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    # Check for conflicts
    if check_rental_conflicts(db, data.bike_id, data.start_date, data.end_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bike is already rented for the specified date range"
        )
    
    rental = models.Rental(
        bike_id=data.bike_id,
        profile_id=data.profile_id,
        start_date=data.start_date,
        end_date=data.end_date,
        notes=data.notes,
    )
    db.add(rental)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error creating rental")
    db.refresh(rental)
    return rental


def list_rentals(
    db: Session,
    bike_id: Optional[UUID] = None,
    profile_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
):
    """List rentals with optional filters."""
    query = db.query(models.Rental)
    
    if bike_id:
        query = query.filter(models.Rental.bike_id == bike_id)
    
    if profile_id:
        query = query.filter(models.Rental.profile_id == profile_id)
    
    if start_date:
        query = query.filter(
            or_(
                models.Rental.end_date.is_(None),
                models.Rental.end_date >= start_date
            )
        )
    
    if end_date:
        query = query.filter(models.Rental.start_date <= end_date)
    
    return query.order_by(models.Rental.start_date.desc()).offset(skip).limit(limit).all()


def get_rental(db: Session, rental_id: UUID):
    """Get a rental by ID."""
    rental = db.query(models.Rental).filter(models.Rental.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    return rental


def update_rental(db: Session, rental_id: UUID, update: schemas.RentalUpdate):
    """Update a rental, checking for conflicts."""
    rental = get_rental(db, rental_id)
    update_data = update.model_dump(exclude_unset=True)
    
    # Get new values or use existing ones
    new_bike_id = update_data.get("bike_id", rental.bike_id)
    new_start_date = update_data.get("start_date", rental.start_date)
    new_end_date = update_data.get("end_date", rental.end_date)
    
    # Check for conflicts if bike or dates are being changed
    if "bike_id" in update_data or "start_date" in update_data or "end_date" in update_data:
        if check_rental_conflicts(db, new_bike_id, new_start_date, new_end_date, exclude_rental_id=rental_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bike is already rented for the specified date range"
            )
    
    # Verify bike exists if being changed
    if "bike_id" in update_data:
        get_bike(db, update_data["bike_id"])
    
    # Verify profile exists if being changed
    if "profile_id" in update_data:
        profile = (
            db.query(auth_models.UserProfile)
            .filter(auth_models.UserProfile.id == update_data["profile_id"])
            .first()
        )
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    for key, value in update_data.items():
        setattr(rental, key, value)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflict updating rental")
    db.refresh(rental)
    return rental


def delete_rental(db: Session, rental_id: UUID):
    """Delete a rental."""
    rental = get_rental(db, rental_id)
    db.delete(rental)
    db.commit()

