from api_gateway.core import security


def test_hash_and_verify_password():
    plain = "s3cret!"
    hashed = security.hash_password(plain)
    assert hashed.startswith("sha256$")
    assert security.verify_password(plain, hashed) is True
    assert security.verify_password("wrong", hashed) is False


def test_create_and_decode_refresh_token():
    subject = "123e4567-e89b-12d3-a456-426614174000"
    token = security.create_refresh_token(subject, jti="abcd")
    payload = security.decode_refresh_token(token)
    assert payload["sub"] == subject
    assert payload["jti"]
    assert payload["typ"] == "refresh"



