"""ReCircuit backend API tests"""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

COLLECTOR = ("collector@nullset.dev", "Collector@123")
RECYCLER = ("recycler@nullset.dev", "Recycler@123")
ADMIN = ("mrsalbertyadav@gmail.com", "Admin@1234")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def collector_token():
    return _login(*COLLECTOR)["token"]


@pytest.fixture(scope="module")
def recycler_token():
    return _login(*RECYCLER)["token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(*ADMIN)["token"]


# ---------------- AUTH ----------------
class TestAuth:
    def test_login_collector(self):
        data = _login(*COLLECTOR)
        assert data["user"]["role"] == "collector"
        assert data["user"]["email"] == COLLECTOR[0]
        assert isinstance(data["token"], str) and data["token"]

    def test_me(self, collector_token):
        r = requests.get(f"{API}/auth/me", headers=_hdr(collector_token))
        assert r.status_code == 200
        assert r.json()["email"] == COLLECTOR[0]
        assert r.json()["role"] == "collector"

    def test_wrong_password(self):
        # Use a distinct email to avoid lockout on real user
        r = requests.post(f"{API}/auth/login", json={"email": "nonexistent_ratelim@nullset.dev", "password": "Wrong@123"})
        assert r.status_code == 401

    def test_register_admin_rejected(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Bad Admin", "email": f"TEST_admin_{int(time.time())}@nullset.dev",
            "password": "Passw0rd!", "role": "admin"})
        assert r.status_code == 400

    def test_register_collector_ok(self):
        email = f"TEST_col_{int(time.time()*1000)}@nullset.dev"
        r = requests.post(f"{API}/auth/register", json={
            "name": "Test Collector", "email": email, "password": "Passw0rd!", "role": "collector"})
        assert r.status_code in (200, 201)
        body = r.json()
        assert body["user"]["role"] == "collector"
        assert body["token"]
        # duplicate
        r2 = requests.post(f"{API}/auth/register", json={
            "name": "Test Collector", "email": email, "password": "Passw0rd!", "role": "collector"})
        assert r2.status_code == 400


# ---------------- STATS / CATEGORIES ----------------
class TestPublic:
    def test_stats(self):
        r = requests.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_kg", "rupees_paid", "collectors", "recyclers", "listings", "lots_completed"]:
            assert k in d
        assert d["listings"] >= 10

    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        d = r.json()
        assert any(c["key"] == "laptop" for c in d["categories"])


# ---------------- CATEGORIZE + ESTIMATE ----------------
class TestPricing:
    def test_categorize(self, collector_token):
        r = requests.post(f"{API}/categorize", json={"text": "two dell laptops and a cracked monitor"},
                          headers=_hdr(collector_token))
        assert r.status_code == 200
        d = r.json()
        assert d["category"] in ("laptop", "monitor_tv")
        assert d["confidence"] > 0

    def test_categorize_requires_auth(self):
        r = requests.post(f"{API}/categorize", json={"text": "laptop"})
        assert r.status_code == 401

    def test_estimate(self, collector_token):
        r = requests.post(f"{API}/estimate",
                          json={"category": "laptop", "weight_kg": 10, "condition": "working"},
                          headers=_hdr(collector_token))
        assert r.status_code == 200
        d = r.json()
        assert d["estimated_price"] == 5850.0


# ---------------- LISTING FLOW ----------------
class TestListingFlow:
    listing_id = None

    def test_recycler_cannot_create_listing(self, recycler_token):
        r = requests.post(f"{API}/listings", headers=_hdr(recycler_token), json={
            "title": "TEST recycler-should-fail", "category": "laptop", "weight_kg": 1, "condition": "working"})
        assert r.status_code == 403

    def test_create_listing(self, collector_token):
        r = requests.post(f"{API}/listings", headers=_hdr(collector_token), json={
            "title": "TEST Lot Old Laptops", "description": "TEST", "location": "Blr",
            "category": "laptop", "weight_kg": 4, "condition": "working"})
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["status"] == "open"
        assert d["estimated_price"] == round(450 * 4 * 1.3, 2)
        TestListingFlow.listing_id = d["id"]

    def test_listings_mine(self, collector_token):
        r = requests.get(f"{API}/listings/mine", headers=_hdr(collector_token))
        assert r.status_code == 200
        assert any(l["id"] == TestListingFlow.listing_id for l in r.json())

    def test_open_listings(self, recycler_token):
        r = requests.get(f"{API}/listings/open", headers=_hdr(recycler_token))
        assert r.status_code == 200
        assert any(l["id"] == TestListingFlow.listing_id for l in r.json())

    def test_match(self, recycler_token):
        lid = TestListingFlow.listing_id
        r = requests.post(f"{API}/listings/{lid}/match", headers=_hdr(recycler_token))
        assert r.status_code == 200
        assert r.json()["status"] == "matched"
        # match again -> 400
        r2 = requests.post(f"{API}/listings/{lid}/match", headers=_hdr(recycler_token))
        assert r2.status_code == 400

    def test_checkout(self, recycler_token):
        lid = TestListingFlow.listing_id
        r = requests.post(f"{API}/listings/{lid}/checkout", headers=_hdr(recycler_token),
                          json={"origin_url": "https://waste-value-hub.preview.emergentagent.com"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "checkout.stripe.com" in d["checkout_url"]
        assert d["session_id"]
        # payment status pending
        r2 = requests.get(f"{API}/payments/status/{d['session_id']}")
        assert r2.status_code == 200
        assert r2.json()["payment_status"] in ("pending", "unpaid", "initiated")

    def test_handover_on_open_400(self, collector_token, recycler_token):
        # Create another new open listing
        r = requests.post(f"{API}/listings", headers=_hdr(collector_token), json={
            "title": "TEST no-payment", "category": "cables", "weight_kg": 2, "condition": "scrap"})
        lid = r.json()["id"]
        r2 = requests.post(f"{API}/listings/{lid}/handover", headers=_hdr(collector_token))
        assert r2.status_code == 400

    def test_handover_paid_seeded(self, recycler_token):
        # Fetch recycler purchases and find any 'paid' listing
        r = requests.get(f"{API}/listings/purchases", headers=_hdr(recycler_token))
        assert r.status_code == 200
        paid = [l for l in r.json() if l["status"] == "paid"]
        if not paid:
            pytest.skip("No paid seeded listing available (may have been completed already)")
        lid = paid[0]["id"]
        r2 = requests.post(f"{API}/listings/{lid}/handover", headers=_hdr(recycler_token))
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d["status"] == "completed"
        assert d["handover_code"].startswith("EW-")


# ---------------- WALLET ----------------
class TestWallet:
    def test_wallet(self, collector_token):
        r = requests.get(f"{API}/wallet", headers=_hdr(collector_token))
        assert r.status_code == 200
        d = r.json()
        assert "balance" in d and isinstance(d["entries"], list)
        assert d["balance"] > 0


# ---------------- ADMIN ----------------
class TestAdmin:
    def test_overview(self, admin_token):
        r = requests.get(f"{API}/admin/overview", headers=_hdr(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d and len(d["chart"]) == 14
        assert "recent_logs" in d and "recent_listings" in d

    def test_logs(self, admin_token):
        r = requests.get(f"{API}/admin/logs", headers=_hdr(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_users(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=_hdr(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_collector_forbidden(self, collector_token):
        r = requests.get(f"{API}/admin/logs", headers=_hdr(collector_token))
        assert r.status_code == 403


# ---------------- UPLOAD + FILES ----------------
class TestUpload:
    def test_upload_and_serve(self, collector_token):
        # 1x1 transparent PNG
        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
            "890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
        )
        files = {"file": ("t.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/upload", headers=_hdr(collector_token), files=files)
        assert r.status_code == 200, r.text
        path = r.json()["path"]
        # serve with ?auth
        r2 = requests.get(f"{API}/files/{path}?auth={collector_token}")
        assert r2.status_code == 200
        assert r2.content == png

    def test_upload_bad_content_type(self, collector_token):
        files = {"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(f"{API}/upload", headers=_hdr(collector_token), files=files)
        assert r.status_code == 400
