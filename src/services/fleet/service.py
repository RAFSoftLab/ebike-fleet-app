from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, func as sql_func, cast, String
from fastapi import HTTPException, status
from uuid import UUID
from . import models, schemas
from . import exchange_rate_service
from typing import List, Tuple, Optional
from datetime import date
from services.authentication import models as auth_models
from decimal import Decimal


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


def list_bikes(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    """
    List bikes with optional search filter.
    Searches serial_number, make, model, and status.
    """
    query = db.query(models.Bike)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                sql_func.lower(models.Bike.serial_number).like(search_term),
                sql_func.lower(models.Bike.make).like(search_term),
                sql_func.lower(models.Bike.model).like(search_term),
                sql_func.lower(cast(models.Bike.status, String)).like(search_term),
            )
        )
    
    return query.offset(skip).limit(limit).all()


def list_bikes_for_profile(db: Session, profile_id: UUID, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    """
    List bikes for a specific profile with optional search filter.
    """
    query = (
        db.query(models.Bike)
        .filter(models.Bike.assigned_profile_id == profile_id)
    )
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                sql_func.lower(models.Bike.serial_number).like(search_term),
                sql_func.lower(models.Bike.make).like(search_term),
                sql_func.lower(models.Bike.model).like(search_term),
                sql_func.lower(cast(models.Bike.status, String)).like(search_term),
            )
        )
    
    return query.offset(skip).limit(limit).all()


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


def list_batteries(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    """
    List batteries with optional search filter.
    Searches serial_number, status, and health_status.
    """
    query = db.query(models.Battery)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                sql_func.lower(models.Battery.serial_number).like(search_term),
                sql_func.lower(cast(models.Battery.status, String)).like(search_term),
                sql_func.lower(cast(models.Battery.health_status, String)).like(search_term),
            )
        )
    
    return query.offset(skip).limit(limit).all()


def list_batteries_for_profile(db: Session, profile_id: UUID, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    """
    List batteries for a specific profile with optional search filter.
    """
    query = (
        db.query(models.Battery)
        .join(models.Bike, models.Battery.assigned_bike_id == models.Bike.id)
        .filter(models.Bike.assigned_profile_id == profile_id)
    )
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                sql_func.lower(models.Battery.serial_number).like(search_term),
                sql_func.lower(cast(models.Battery.status, String)).like(search_term),
                sql_func.lower(cast(models.Battery.health_status, String)).like(search_term),
            )
        )
    
    return query.offset(skip).limit(limit).all()


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


def list_driver_profiles(db: Session, search: Optional[str] = None) -> List[Tuple[auth_models.User, auth_models.UserProfile]]:
    """
    Return (User, UserProfile) rows for all users with the driver role
    that have an associated profile.
    Optionally filter by search term (searches first_name, last_name, email, username, phone_number).
    """
    query = (
        db.query(auth_models.User, auth_models.UserProfile)
        .join(auth_models.UserProfile, auth_models.UserProfile.user_id == auth_models.User.id)
        .filter(auth_models.User.role == auth_models.RoleEnum.driver)
    )
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                sql_func.lower(auth_models.UserProfile.first_name).like(search_term),
                sql_func.lower(auth_models.UserProfile.last_name).like(search_term),
                sql_func.lower(auth_models.User.email).like(search_term),
                sql_func.lower(auth_models.User.username).like(search_term),
                sql_func.lower(auth_models.UserProfile.phone_number).like(search_term),
            )
        )
    
    rows: List[Tuple[auth_models.User, auth_models.UserProfile]] = query.all()
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
    limit: int = 100,
    search: Optional[str] = None
):
    """
    List rentals with optional filters.
    Search filters by bike serial_number, driver name, or notes.
    """
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
    
    if search:
        search_term = f"%{search.lower()}%"
        # Find matching bike IDs
        matching_bike_ids = [
            bike.id for bike in db.query(models.Bike.id).filter(
                sql_func.lower(models.Bike.serial_number).like(search_term)
            ).all()
        ]
        
        # Find matching profile IDs
        matching_profile_ids = [
            profile.id for profile in db.query(auth_models.UserProfile.id).join(
                auth_models.User, auth_models.UserProfile.user_id == auth_models.User.id
            ).filter(
                or_(
                    sql_func.lower(auth_models.UserProfile.first_name).like(search_term),
                    sql_func.lower(auth_models.UserProfile.last_name).like(search_term),
                )
            ).all()
        ]
        
        # Filter rentals by matching bike IDs, profile IDs, or notes
        search_filters = [sql_func.lower(models.Rental.notes).like(search_term)]
        if matching_bike_ids:
            search_filters.append(models.Rental.bike_id.in_(matching_bike_ids))
        if matching_profile_ids:
            search_filters.append(models.Rental.profile_id.in_(matching_profile_ids))
        
        query = query.filter(or_(*search_filters))
    
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


# Maintenance Records
def create_maintenance_record(db: Session, data: schemas.MaintenanceRecordCreate):
    """Create a new maintenance record and associated financial transaction."""
    # Validate that either bike or battery exists
    if data.bike_id:
        bike = get_bike(db, data.bike_id)
    if data.battery_id:
        battery = get_battery(db, data.battery_id)
    
    # Create maintenance record
    maintenance_record = models.MaintenanceRecord(
        bike_id=data.bike_id,
        battery_id=data.battery_id,
        service_date=data.service_date,
        description=data.description,
        cost=data.cost,
        currency=data.currency or "RSD",
        notes=data.notes,
    )
    db.add(maintenance_record)
    
    try:
        db.flush()  # Flush to get the ID
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error creating maintenance record")
    
    # Create associated financial transaction for the expense
    transaction = models.FinancialTransaction(
        transaction_type=models.TransactionType.expense,
        amount=data.cost,
        currency=data.currency or "RSD",
        description=f"Maintenance: {data.description}",
        maintenance_record_id=maintenance_record.id,
        transaction_date=data.service_date,
    )
    db.add(transaction)
    
    # Update last_service_at on bike or battery
    if data.bike_id:
        bike.last_service_at = maintenance_record.created_at
    if data.battery_id:
        battery.last_service_at = maintenance_record.created_at
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error creating maintenance record")
    
    db.refresh(maintenance_record)
    return maintenance_record


def list_maintenance_records(
    db: Session,
    bike_id: Optional[UUID] = None,
    battery_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100
):
    """List maintenance records with optional filters."""
    query = db.query(models.MaintenanceRecord)
    
    if bike_id:
        query = query.filter(models.MaintenanceRecord.bike_id == bike_id)
    
    if battery_id:
        query = query.filter(models.MaintenanceRecord.battery_id == battery_id)
    
    return query.order_by(models.MaintenanceRecord.service_date.desc()).offset(skip).limit(limit).all()


def get_maintenance_record(db: Session, record_id: UUID):
    """Get a maintenance record by ID."""
    record = db.query(models.MaintenanceRecord).filter(models.MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")
    return record


def update_maintenance_record(db: Session, record_id: UUID, update: schemas.MaintenanceRecordUpdate):
    """Update a maintenance record."""
    record = get_maintenance_record(db, record_id)
    update_data = update.model_dump(exclude_unset=True)
    
    # Validate references if being updated
    new_bike_id = update_data.get("bike_id", record.bike_id)
    new_battery_id = update_data.get("battery_id", record.battery_id)
    
    if not new_bike_id and not new_battery_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either bike_id or battery_id must be provided"
        )
    
    if new_bike_id:
        get_bike(db, new_bike_id)
    if new_battery_id:
        get_battery(db, new_battery_id)
    
    # Update cost if changed, and update associated transaction
    old_cost = record.cost
    new_cost = update_data.get("cost", old_cost)
    
    for key, value in update_data.items():
        setattr(record, key, value)
    
    # Update associated financial transaction if cost or currency changed
    if ("cost" in update_data and old_cost != new_cost) or "currency" in update_data:
        transaction = (
            db.query(models.FinancialTransaction)
            .filter(models.FinancialTransaction.maintenance_record_id == record_id)
            .first()
        )
        if transaction:
            if "cost" in update_data:
                transaction.amount = new_cost
            if "currency" in update_data:
                transaction.currency = update_data["currency"]
            if "description" in update_data:
                transaction.description = f"Maintenance: {update_data['description']}"
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflict updating maintenance record")
    
    db.refresh(record)
    return record


def delete_maintenance_record(db: Session, record_id: UUID):
    """Delete a maintenance record. Associated transaction will be deleted via CASCADE."""
    record = get_maintenance_record(db, record_id)
    db.delete(record)
    db.commit()


# Financial Transactions
def create_financial_transaction(db: Session, data: schemas.FinancialTransactionCreate):
    """Create a financial transaction."""
    # Validate references
    if data.rental_id:
        get_rental(db, data.rental_id)
    if data.maintenance_record_id:
        get_maintenance_record(db, data.maintenance_record_id)
    
    transaction = models.FinancialTransaction(
        transaction_type=models.TransactionType[data.transaction_type],
        amount=data.amount,
        currency=data.currency or "RSD",
        description=data.description,
        rental_id=data.rental_id,
        maintenance_record_id=data.maintenance_record_id,
        transaction_date=data.transaction_date,
    )
    db.add(transaction)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error creating financial transaction")
    
    db.refresh(transaction)
    return transaction


def list_financial_transactions(
    db: Session,
    transaction_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
):
    """List financial transactions with optional filters."""
    query = db.query(models.FinancialTransaction)
    
    if transaction_type:
        query = query.filter(models.FinancialTransaction.transaction_type == models.TransactionType[transaction_type])
    
    if start_date:
        query = query.filter(models.FinancialTransaction.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(models.FinancialTransaction.transaction_date <= end_date)
    
    return query.order_by(models.FinancialTransaction.transaction_date.desc()).offset(skip).limit(limit).all()


def get_financial_transaction(db: Session, transaction_id: UUID):
    """Get a financial transaction by ID."""
    transaction = db.query(models.FinancialTransaction).filter(models.FinancialTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial transaction not found")
    return transaction


def update_financial_transaction(db: Session, transaction_id: UUID, update: schemas.FinancialTransactionUpdate):
    """Update a financial transaction."""
    transaction = get_financial_transaction(db, transaction_id)
    update_data = update.model_dump(exclude_unset=True)
    
    if "transaction_type" in update_data:
        update_data["transaction_type"] = models.TransactionType[update_data["transaction_type"]]
    
    # Validate references if being updated
    if "rental_id" in update_data:
        get_rental(db, update_data["rental_id"])
    if "maintenance_record_id" in update_data:
        get_maintenance_record(db, update_data["maintenance_record_id"])
    
    for key, value in update_data.items():
        setattr(transaction, key, value)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflict updating financial transaction")
    
    db.refresh(transaction)
    return transaction


def delete_financial_transaction(db: Session, transaction_id: UUID):
    """Delete a financial transaction."""
    transaction = get_financial_transaction(db, transaction_id)
    db.delete(transaction)
    db.commit()


def get_financial_summary(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    target_currency: Optional[str] = None
) -> schemas.FinancialSummary:
    """
    Get financial summary (income, expenses, net profit).
    If target_currency is provided, converts all amounts to that currency.
    """
    query = db.query(models.FinancialTransaction)
    
    if start_date:
        query = query.filter(models.FinancialTransaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(models.FinancialTransaction.transaction_date <= end_date)
    
    # Get display currency (default to app setting)
    if target_currency is None:
        target_currency = get_currency(db)
    
    # Calculate totals with currency conversion
    income_query = query.filter(models.FinancialTransaction.transaction_type == models.TransactionType.income)
    expense_query = query.filter(models.FinancialTransaction.transaction_type == models.TransactionType.expense)
    
    total_income = Decimal('0')
    total_expenses = Decimal('0')
    
    # Convert each transaction to target currency
    for transaction in income_query.all():
        converted = exchange_rate_service.convert_amount(
            db, transaction.amount, transaction.currency, target_currency, transaction.transaction_date
        )
        if converted:
            total_income += converted
        else:
            # Fallback: use original amount if conversion fails
            total_income += transaction.amount
    
    for transaction in expense_query.all():
        converted = exchange_rate_service.convert_amount(
            db, transaction.amount, transaction.currency, target_currency, transaction.transaction_date
        )
        if converted:
            total_expenses += converted
        else:
            # Fallback: use original amount if conversion fails
            total_expenses += transaction.amount
    
    income_count = income_query.count()
    expense_count = expense_query.count()
    
    return schemas.FinancialSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=total_income - total_expenses,
        income_count=income_count,
        expense_count=expense_count,
    )


# Application Settings
def get_setting(db: Session, key: str, default: Optional[str] = None) -> Optional[str]:
    """Get a setting value by key."""
    setting = db.query(models.ApplicationSettings).filter(models.ApplicationSettings.key == key).first()
    if setting:
        return setting.value
    return default


def get_currency(db: Session) -> str:
    """Get the current currency setting, defaulting to RSD."""
    return get_setting(db, "currency", "RSD")


def update_setting(db: Session, key: str, value: str) -> models.ApplicationSettings:
    """Update or create a setting."""
    setting = db.query(models.ApplicationSettings).filter(models.ApplicationSettings.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = models.ApplicationSettings(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def update_currency(db: Session, currency: str) -> models.ApplicationSettings:
    """Update the currency setting."""
    return update_setting(db, "currency", currency)

