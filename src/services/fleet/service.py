from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from uuid import UUID
from . import models, schemas
from typing import List
from services.authentication import models as auth_models


# Bikes
def create_bike(db: Session, data: schemas.BikeCreate):
    bike = models.Bike(
        serial_number=data.serial_number,
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


