from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class BikeBase(BaseModel):
    serial_number: str
    make: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = "available"
    mileage: Optional[int] = 0
    last_service_at: Optional[datetime] = None
    assigned_profile_id: Optional[UUID] = None


class BikeCreate(BikeBase):
    serial_number: str


class BikeUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
    mileage: Optional[int] = None
    last_service_at: Optional[datetime] = None
    assigned_profile_id: Optional[UUID] = None


class BikeRead(BikeBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BatteryBase(BaseModel):
    serial_number: str
    capacity_wh: Optional[int] = None
    charge_level: Optional[int] = 100
    cycle_count: Optional[int] = 0
    health_status: Optional[str] = "good"
    status: Optional[str] = "available"
    last_service_at: Optional[datetime] = None
    assigned_bike_id: Optional[UUID] = None


class BatteryCreate(BatteryBase):
    serial_number: str


class BatteryUpdate(BaseModel):
    capacity_wh: Optional[int] = None
    charge_level: Optional[int] = None
    cycle_count: Optional[int] = None
    health_status: Optional[str] = None
    status: Optional[str] = None
    last_service_at: Optional[datetime] = None
    assigned_bike_id: Optional[UUID] = None


class BatteryRead(BatteryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BikeWithBatteriesRead(BikeRead):
    batteries: list[BatteryRead]


