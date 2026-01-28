import io

from PIL import Image


def _make_png_bytes():
    img = Image.new("RGB", (8, 8), color=(255, 0, 0))
    bio = io.BytesIO()
    img.save(bio, format="PNG")
    bio.seek(0)
    return bio


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


def test_register_login_me(client):
    payload = {"email": "user@example.com", "password": "pass1234"}
    res = client.post("/api/register", json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert "token" in data
    assert data["user"]["email"] == "user@example.com"

    res = client.post("/api/login", json=payload)
    assert res.status_code == 200
    token = res.get_json()["token"]

    res = client.get("/api/me")
    assert res.status_code == 401

    res = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    body = res.get_json()
    assert body["user"]["email"] == "user@example.com"


def test_convert_requires_file(client):
    res = client.post("/api/convert")
    assert res.status_code == 400


def test_convert_success(client):
    img = _make_png_bytes()
    data = {"image": (img, "sample.png")}
    res = client.post("/api/convert", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    assert res.mimetype == "image/webp"
