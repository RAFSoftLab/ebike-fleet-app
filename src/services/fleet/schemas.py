from pydantic import BaseModel, ConfigDict, model_validator, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


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


class RentalBase(BaseModel):
    bike_id: UUID
    profile_id: UUID
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode='after')
    def validate_dates(self):
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError('end_date must be after start_date')
        return self


class RentalCreate(RentalBase):
    pass


class RentalUpdate(BaseModel):
    bike_id: Optional[UUID] = None
    profile_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode='after')
    def validate_dates(self):
        if self.end_date is not None and self.start_date is not None:
            if self.end_date < self.start_date:
                raise ValueError('end_date must be after start_date')
        return self


class RentalRead(RentalBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RentalWithDetailsRead(RentalRead):
    bike: BikeRead
    profile: Optional[dict] = None


# Financial Transaction Schemas
class FinancialTransactionBase(BaseModel):
    transaction_type: str
    amount: Decimal = Field(..., description="Transaction amount (positive)")
    description: Optional[str] = None
    rental_id: Optional[UUID] = None
    maintenance_record_id: Optional[UUID] = None
    transaction_date: date


class FinancialTransactionCreate(FinancialTransactionBase):
    pass


class FinancialTransactionUpdate(BaseModel):
    transaction_type: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    rental_id: Optional[UUID] = None
    maintenance_record_id: Optional[UUID] = None
    transaction_date: Optional[date] = None


class FinancialTransactionRead(FinancialTransactionBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Maintenance Record Schemas
class MaintenanceRecordBase(BaseModel):
    bike_id: Optional[UUID] = None
    battery_id: Optional[UUID] = None
    service_date: date
    description: str = Field(..., description="What maintenance was performed")
    cost: Decimal = Field(..., description="Cost of the maintenance", ge=0)
    notes: Optional[str] = None

    @model_validator(mode='after')
    def validate_reference(self):
        if not self.bike_id and not self.battery_id:
            raise ValueError('Either bike_id or battery_id must be provided')
        if self.bike_id and self.battery_id:
            raise ValueError('Cannot specify both bike_id and battery_id')
        return self


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecordUpdate(BaseModel):
    bike_id: Optional[UUID] = None
    battery_id: Optional[UUID] = None
    service_date: Optional[date] = None
    description: Optional[str] = None
    cost: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None

    @model_validator(mode='after')
    def validate_reference(self):
        # If both are being set to None or both are being set, validate
        bike_id = self.bike_id
        battery_id = self.battery_id
        if bike_id is not None and battery_id is not None:
            raise ValueError('Cannot specify both bike_id and battery_id')
        return self


class MaintenanceRecordRead(MaintenanceRecordBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MaintenanceRecordWithDetailsRead(MaintenanceRecordRead):
    bike: Optional[BikeRead] = None
    battery: Optional[BatteryRead] = None


# Financial Analytics Schemas
class FinancialSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    income_count: int
    expense_count: int


class FinancialAnalytics(BaseModel):
    summary: FinancialSummary
    transactions: list[FinancialTransactionRead]

