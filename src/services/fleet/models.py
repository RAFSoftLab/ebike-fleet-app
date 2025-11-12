from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SAEnum
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


