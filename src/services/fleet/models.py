from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SAEnum, Date, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from api_gateway.core.database import Base
import enum


class BikeStatus(enum.Enum):
    available = "available"
    assigned = "assigned"
    maintenance = "maintenance"
    retired = "retired"


class Bike(Base):
    __tablename__ = "bikes"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    serial_number = Column(String, unique=True, nullable=False)
    # Lowercased copy of serial_number to enforce case-insensitive uniqueness
    serial_number_ci = Column(String, unique=True, nullable=False, index=True)
    make = Column(String, nullable=True)
    model = Column(String, nullable=True)
    status = Column(SAEnum(BikeStatus, name="bike_status"), nullable=False, default=BikeStatus.available)
    mileage = Column(Integer, nullable=False, default=0)
    last_service_at = Column(DateTime(timezone=True), nullable=True)

    assigned_profile_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    assigned_profile = relationship("UserProfile", backref="bikes", foreign_keys=[assigned_profile_id])


class BatteryStatus(enum.Enum):
    available = "available"
    assigned = "assigned"
    charging = "charging"
    maintenance = "maintenance"
    retired = "retired"


class BatteryHealth(enum.Enum):
    good = "good"
    degraded = "degraded"
    poor = "poor"


class Battery(Base):
    __tablename__ = "batteries"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    serial_number = Column(String, unique=True, nullable=False)
    capacity_wh = Column(Integer, nullable=True)
    charge_level = Column(Integer, nullable=False, default=100)
    cycle_count = Column(Integer, nullable=False, default=0)
    health_status = Column(SAEnum(BatteryHealth, name="battery_health"), nullable=False, default=BatteryHealth.good)
    status = Column(SAEnum(BatteryStatus, name="battery_status"), nullable=False, default=BatteryStatus.available)
    last_service_at = Column(DateTime(timezone=True), nullable=True)

    assigned_bike_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bikes.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    bike = relationship("Bike", backref="batteries", foreign_keys=[assigned_bike_id])


class Rental(Base):
    __tablename__ = "rentals"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    bike_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bikes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    profile_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True, index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    bike = relationship("Bike", backref="rentals", foreign_keys=[bike_id])
    profile = relationship("UserProfile", backref="rentals", foreign_keys=[profile_id])


class TransactionType(enum.Enum):
    income = "income"
    expense = "expense"


class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    transaction_type = Column(SAEnum(TransactionType, name="transaction_type"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, nullable=False, default="RSD", server_default="RSD")
    description = Column(Text, nullable=True)
    # Optional references to related entities
    rental_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rentals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    maintenance_record_id = Column(
        UUID(as_uuid=True),
        ForeignKey("maintenance_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    transaction_date = Column(Date, nullable=False, index=True, server_default=func.current_date())
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    rental = relationship("Rental", backref="transactions", foreign_keys=[rental_id])
    maintenance_record = relationship("MaintenanceRecord", backref="transaction", foreign_keys=[maintenance_record_id])


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    # Reference to either bike or battery (one must be set)
    bike_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bikes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    battery_id = Column(
        UUID(as_uuid=True),
        ForeignKey("batteries.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    service_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=False, comment="What maintenance was performed")
    cost = Column(Numeric(10, 2), nullable=False, comment="Cost of the maintenance")
    currency = Column(String, nullable=False, default="RSD", server_default="RSD")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    bike = relationship("Bike", backref="maintenance_records", foreign_keys=[bike_id])
    battery = relationship("Battery", backref="maintenance_records", foreign_keys=[battery_id])


class ApplicationSettings(Base):
    __tablename__ = "application_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    base_currency = Column(String, nullable=False)
    target_currency = Column(String, nullable=False)
    rate = Column(Numeric(10, 6), nullable=False)
    rate_date = Column(Date, nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


