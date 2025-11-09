import uuid
from sqlalchemy.orm import Session

from services.fleet import service as fleet_service
from services.fleet import schemas as fleet_schemas
from services.fleet import models as fleet_models
from services.authentication import models as auth_models


def test_create_and_get_bike(db_session: Session):
    bike_in = fleet_schemas.BikeCreate(serial_number=f"SN-{uuid.uuid4().hex[:8]}")
    bike = fleet_service.create_bike(db_session, bike_in)
    fetched = fleet_service.get_bike(db_session, bike.id)
    assert fetched.id == bike.id
    assert fetched.status == fleet_models.BikeStatus.available


def test_update_and_delete_bike(db_session: Session):
    bike = fleet_service.create_bike(
        db_session, fleet_schemas.BikeCreate(serial_number=f"SN-{uuid.uuid4().hex[:8]}")
    )
    updated = fleet_service.update_bike(db_session, bike.id, fleet_schemas.BikeUpdate(make="ACME"))
    assert updated.make == "ACME"

    fleet_service.delete_bike(db_session, bike.id)
    # get_bike should now raise 404
    try:
        fleet_service.get_bike(db_session, bike.id)
    except Exception:
        pass
    else:
        assert False, "Expected exception when fetching deleted bike"


def test_battery_assignments(db_session: Session):
    bike = fleet_service.create_bike(
        db_session, fleet_schemas.BikeCreate(serial_number=f"SN-{uuid.uuid4().hex[:8]}")
    )
    battery = fleet_service.create_battery(
        db_session, fleet_schemas.BatteryCreate(serial_number=f"BAT-{uuid.uuid4().hex[:8]}")
    )

    assigned = fleet_service.assign_battery_to_bike(db_session, bike.id, battery.id)
    assert assigned.assigned_bike_id == bike.id

    unassigned = fleet_service.unassign_battery_from_bike(db_session, bike.id, battery.id)
    assert unassigned.assigned_bike_id is None


def test_list_for_profile(db_session: Session):
    # Create a user profile and a bike assigned to it
    user = auth_models.User(username="puser", email="p@example.com", password_hash="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = auth_models.UserProfile(user_id=user.id)
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    bike1 = fleet_service.create_bike(
        db_session,
        fleet_schemas.BikeCreate(serial_number=f"SN-{uuid.uuid4().hex[:8]}", assigned_profile_id=profile.id),
    )
    bike2 = fleet_service.create_bike(
        db_session,
        fleet_schemas.BikeCreate(serial_number=f"SN-{uuid.uuid4().hex[:8]}")
    )

    only_mine = fleet_service.list_bikes_for_profile(db_session, profile.id)
    assert any(b.id == bike1.id for b in only_mine)
    assert all(b.assigned_profile_id == profile.id for b in only_mine)

