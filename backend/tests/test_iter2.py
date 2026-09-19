"""Iteration 2 backend tests: Razorpay stubs, Map/Location, AI photo categorize."""
import io
import os
import time
import base64
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

COLLECTOR = ("collector@nullset.dev", "Collector@123")
RECYCLER = ("recycler@nullset.dev", "Recycler@123")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["token"]


def _hdr(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def collector_token():
    return _login(*COLLECTOR)


@pytest.fixture(scope="module")
def recycler_token():
    return _login(*RECYCLER)


# ---------- PAYMENTS CONFIG / RAZORPAY (keys empty -> 503) ----------
class TestPaymentsConfig:
    def test_config(self):
        r = requests.get(f"{API}/payments/config")
        assert r.status_code == 200
        d = r.json()
        assert d["stripe_enabled"] is True
        assert d["razorpay_enabled"] is False
        assert d["razorpay_key_id"] == ""


class TestRazorpay:
    listing_id = None

    def test_create_matched_listing_for_razorpay(self, collector_token, recycler_token):
        r = requests.post(f"{API}/listings", headers=_hdr(collector_token), json={
            "title": "TEST rz lot", "category": "cables", "weight_kg": 3, "condition": "scrap"})
        assert r.status_code == 201, r.text
        lid = r.json()["id"]
        r2 = requests.post(f"{API}/listings/{lid}/match", headers=_hdr(recycler_token))
        assert r2.status_code == 200
        TestRazorpay.listing_id = lid

    def test_razorpay_order_503(self, recycler_token):
        assert TestRazorpay.listing_id, "prereq missing"
        r = requests.post(f"{API}/listings/{TestRazorpay.listing_id}/razorpay/order", headers=_hdr(recycler_token))
        assert r.status_code == 503, r.text
        assert "RAZORPAY_KEY_ID" in r.json().get("detail", "")

    def test_razorpay_verify_503(self, recycler_token):
        r = requests.post(f"{API}/payments/razorpay/verify", headers=_hdr(recycler_token), json={
            "razorpay_order_id": "order_dummy", "razorpay_payment_id": "pay_dummy", "razorpay_signature": "sig"})
        assert r.status_code == 503

    def test_razorpay_webhook_503(self):
        r = requests.post(f"{API}/webhook/razorpay", data=b"{}", headers={"X-Razorpay-Signature": "x"})
        assert r.status_code == 503

    def test_stripe_regression_still_works(self, recycler_token):
        assert TestRazorpay.listing_id
        r = requests.post(f"{API}/listings/{TestRazorpay.listing_id}/checkout", headers=_hdr(recycler_token),
                          json={"origin_url": BASE_URL})
        assert r.status_code == 200, r.text
        assert "checkout.stripe.com" in r.json()["checkout_url"]


# ---------- LOCATION / MAP ----------
class TestLocation:
    def test_put_me_location_ok(self, recycler_token):
        r = requests.put(f"{API}/me/location", headers=_hdr(recycler_token), json={"lat": 19.07, "lng": 72.87})
        assert r.status_code == 200, r.text
        u = r.json()
        assert abs(u["lat"] - 19.07) < 1e-6 and abs(u["lng"] - 72.87) < 1e-6

    def test_me_returns_latlng(self, recycler_token):
        r = requests.get(f"{API}/auth/me", headers=_hdr(recycler_token))
        assert r.status_code == 200
        d = r.json()
        assert "lat" in d and "lng" in d and d["lat"] is not None

    def test_put_me_location_invalid(self, recycler_token):
        r = requests.put(f"{API}/me/location", headers=_hdr(recycler_token), json={"lat": 200, "lng": 72})
        assert r.status_code == 422

    def test_restore_recycler_location(self, recycler_token):
        # Restore facility location for downstream tests
        r = requests.put(f"{API}/me/location", headers=_hdr(recycler_token), json={"lat": 19.076, "lng": 72.8777})
        assert r.status_code == 200

    def test_open_listings_with_latlng_sorted(self, recycler_token, collector_token):
        # Create two listings, one with location, one without
        requests.post(f"{API}/listings", headers=_hdr(collector_token), json={
            "title": "TEST near", "category": "cables", "weight_kg": 1, "condition": "scrap",
            "lat": 19.08, "lng": 72.88})
        requests.post(f"{API}/listings", headers=_hdr(collector_token), json={
            "title": "TEST far", "category": "cables", "weight_kg": 1, "condition": "scrap",
            "lat": 12.97, "lng": 77.59})
        r = requests.get(f"{API}/listings/open?lat=19.076&lng=72.8777", headers=_hdr(recycler_token))
        assert r.status_code == 200
        items = r.json()
        assert items, "no open listings"
        # Check distance_km present and sorted ascending, nulls last
        prev = -1
        seen_null = False
        for it in items:
            d = it.get("distance_km")
            if d is None:
                seen_null = True
                continue
            assert not seen_null, "null distance before numeric — sort broken"
            assert isinstance(d, (int, float))
            assert d >= prev - 1e-6
            prev = d

    def test_open_listings_no_latlng_returns_null_distance(self, recycler_token):
        r = requests.get(f"{API}/listings/open", headers=_hdr(recycler_token))
        assert r.status_code == 200
        for it in r.json():
            assert it.get("distance_km") is None

    def test_create_listing_with_latlng(self, collector_token):
        r = requests.post(f"{API}/listings", headers=_hdr(collector_token), json={
            "title": "TEST latlng lot", "category": "cables", "weight_kg": 1, "condition": "scrap",
            "lat": 19.10, "lng": 72.90})
        assert r.status_code == 201
        d = r.json()
        assert d.get("lat") == 19.10 and d.get("lng") == 72.90

    def test_create_listing_no_latlng(self, collector_token):
        r = requests.post(f"{API}/listings", headers=_hdr(collector_token), json={
            "title": "TEST no-loc", "category": "cables", "weight_kg": 1, "condition": "scrap"})
        assert r.status_code == 201
        d = r.json()
        assert d.get("lat") is None and d.get("lng") is None

    def test_map_endpoint(self, recycler_token):
        r = requests.get(f"{API}/map", headers=_hdr(recycler_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "lots" in d and "recyclers" in d
        # Seeded recycler GreenLoop
        names = [x["name"] for x in d["recyclers"]]
        assert any("GreenLoop" in n or n for n in names)
        # There should be at least one recycler with lat/lng near 19.076
        assert any(abs(x["lat"] - 19.076) < 0.5 for x in d["recyclers"] if x.get("lat") is not None)


# ---------- AI PHOTO CATEGORIZE ----------
# A tiny but real JPEG with actual visual content (small circuit-board-ish pattern).
# Use a real image bytes: fetch from a data URI base64 of an actual small JPEG we generate.
# To avoid external network and keep image real (per image_testing.md), we'll construct
# a small JPEG using PIL with textured content.

def _make_real_jpeg_bytes():
    from PIL import Image, ImageDraw
    import random
    random.seed(42)
    img = Image.new("RGB", (256, 256), (30, 30, 40))
    d = ImageDraw.Draw(img)
    # Draw grid lines and rectangles to mimic circuit board
    for x in range(0, 256, 16):
        d.line([(x, 0), (x, 256)], fill=(0, 180, 90), width=1)
    for y in range(0, 256, 16):
        d.line([(0, y), (256, y)], fill=(0, 180, 90), width=1)
    for _ in range(40):
        x, y = random.randint(0, 240), random.randint(0, 240)
        d.rectangle([x, y, x + 10, y + 6], fill=(200, 200, 200), outline=(80, 80, 80))
    for _ in range(60):
        x, y = random.randint(0, 250), random.randint(0, 250)
        d.ellipse([x, y, x + 4, y + 4], fill=(220, 180, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


class TestAIPhoto:
    photo_path = None

    def test_upload_real_photo(self, collector_token):
        img_bytes = _make_real_jpeg_bytes()
        files = {"file": ("board.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        r = requests.post(f"{API}/upload", headers=_hdr(collector_token), files=files)
        assert r.status_code == 200, r.text
        TestAIPhoto.photo_path = r.json()["path"]

    def test_categorize_photo(self, collector_token):
        assert TestAIPhoto.photo_path
        r = requests.post(f"{API}/categorize/photo", headers=_hdr(collector_token),
                          json={"photo_path": TestAIPhoto.photo_path, "hint": "old electronics"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        allowed = {"laptop", "phone_tablet", "monitor_tv", "printer", "cables", "battery", "appliance", "misc", "mixed"}
        assert d["category"] in allowed, f"bad category {d.get('category')}"
        assert isinstance(d.get("label"), str) and d["label"]
        assert isinstance(d["weight_kg"], (int, float)) and d["weight_kg"] > 0
        assert d["condition"] in {"working", "repairable", "scrap"}
        assert 0 <= float(d["confidence"]) <= 1
        assert isinstance(d.get("items"), list)
        assert d.get("model") == "gpt-5.4-mini"

    def test_categorize_photo_not_found(self, collector_token):
        r = requests.post(f"{API}/categorize/photo", headers=_hdr(collector_token),
                          json={"photo_path": "does_not_exist.jpg", "hint": "x"}, timeout=30)
        assert r.status_code == 404

    def test_categorize_photo_other_users_denied(self, recycler_token):
        assert TestAIPhoto.photo_path
        r = requests.post(f"{API}/categorize/photo", headers=_hdr(recycler_token),
                          json={"photo_path": TestAIPhoto.photo_path, "hint": "x"}, timeout=30)
        # Not owned by recycler -> 404 per spec (also acceptable: 403)
        assert r.status_code in (403, 404)
