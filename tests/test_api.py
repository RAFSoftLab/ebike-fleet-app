import uuid

from fastapi.testclient import TestClient

from services.fleet import schemas as fleet_schemas


def test_protected_list_bikes_requires_auth(client: TestClient):
    resp = client.get("/fleet/bikes")
    assert resp.status_code in (401, 403)


def test_admin_can_create_bike(client: TestClient, admin_auth_header: dict):
    payload = fleet_schemas.BikeCreate(serial_number=f"SN-{uuid.uuid4().hex[:8]}").model_dump()
    resp = client.post("/fleet/bikes", json=payload, headers=admin_auth_header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["serial_number"].startswith("SN-")


def test_user_lists_only_their_bikes(client: TestClient, user_auth_header: dict):
    # Initially empty for the user
    resp = client.get("/fleet/bikes", headers=user_auth_header)
    assert resp.status_code == 200
    assert resp.json() == []


