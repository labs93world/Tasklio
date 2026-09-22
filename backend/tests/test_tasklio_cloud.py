"""Cloud-backed Tasklio backend regression suite.

Covers:
- Auth (register/login, duplicate, wrong pw)
- User flows (earn/checkin/payout/chances)
- Admin token acquisition (server key)
- Admin dashboard/users/payouts
- Admin points adjustment + payout approve/reject + broadcast + config
- 403 guard for user token / no token on admin routes
"""

import os
import random
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://github-import-147.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_KEY = "9372@Altaf93Tasklio"


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def new_user(http):
    # unique 10-digit mobile
    mobile = "9" + "".join(str(random.randint(0, 9)) for _ in range(9))
    payload = {"name": "TEST_User", "mobile": mobile, "password": "test123"}
    r = http.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "mobile": mobile, "password": "test123", "id": data["user"]["id"], "state": data}


@pytest.fixture(scope="session")
def user_headers(new_user):
    return {"Authorization": f"Bearer {new_user['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_headers(http):
    r = http.post(f"{API}/auth/admin-token", json={"admin_key": ADMIN_KEY})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


# ------------------- health / config -------------------
class TestHealth:
    def test_root(self, http):
        r = http.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("app") == "Tasklio"

    def test_config_public(self, http):
        r = http.get(f"{API}/config")
        assert r.status_code == 200
        cfg = r.json()
        for k in ("checkinRewards", "chancesPerAd", "pointsPerRupee", "banners", "maintenance"):
            assert k in cfg


# ------------------- Auth -------------------
class TestAuth:
    def test_register_returns_token_and_state(self, new_user):
        assert new_user["token"]
        assert new_user["state"]["user"]["mobile"] == new_user["mobile"]
        assert new_user["state"]["user"]["points"] == 0
        assert "config" in new_user["state"]

    def test_duplicate_mobile_returns_409(self, http, new_user):
        r = http.post(f"{API}/auth/register", json={"name": "dup", "mobile": new_user["mobile"], "password": "test123"})
        assert r.status_code == 409

    def test_login_ok(self, http, new_user):
        r = http.post(f"{API}/auth/login", json={"mobile": new_user["mobile"], "password": new_user["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_wrong_password_401(self, http, new_user):
        r = http.post(f"{API}/auth/login", json={"mobile": new_user["mobile"], "password": "WRONG"})
        assert r.status_code == 401

    def test_invalid_mobile_format(self, http):
        r = http.post(f"{API}/auth/register", json={"name": "x", "mobile": "123", "password": "test123"})
        assert r.status_code == 422


# ------------------- User Flow -------------------
class TestUserFlow:
    def test_me_returns_state(self, http, user_headers):
        r = http.get(f"{API}/me", headers=user_headers)
        assert r.status_code == 200
        state = r.json()
        assert "user" in state and "txns" in state and "payouts" in state and "config" in state

    def test_earn_adds_points_and_txn(self, http, user_headers):
        r = http.post(f"{API}/earn", headers=user_headers, json={"gameId": "spin", "points": 50, "title": "TEST earn"})
        assert r.status_code == 200
        s = r.json()
        assert s["user"]["points"] >= 50
        assert any(t["title"] == "TEST earn" and t["points"] == 50 for t in s["txns"])

    def test_checkin_first_ok_second_400(self, http, user_headers):
        r1 = http.post(f"{API}/checkin", headers=user_headers)
        assert r1.status_code == 200
        assert r1.json().get("reward", 0) > 0
        r2 = http.post(f"{API}/checkin", headers=user_headers)
        assert r2.status_code == 400

    def test_chances_consume_and_add(self, http, user_headers):
        me = http.get(f"{API}/me", headers=user_headers).json()
        before = me["user"]["chances"].get("spin", 0)
        r = http.post(f"{API}/chances/consume", headers=user_headers, json={"gameId": "spin"})
        assert r.status_code == 200
        after_c = r.json()["user"]["chances"].get("spin", 0)
        assert after_c == max(0, before - 1)
        r2 = http.post(f"{API}/chances/add", headers=user_headers, json={"gameId": "spin"})
        assert r2.status_code == 200
        assert r2.json()["user"]["chances"].get("spin", 0) >= after_c + 1

    def test_payout_deducts_and_creates_pending(self, http, user_headers):
        # ensure enough points
        http.post(f"{API}/earn", headers=user_headers, json={"gameId": None, "points": 5000, "title": "TEST payout topup"})
        me = http.get(f"{API}/me", headers=user_headers).json()
        pts_before = me["user"]["points"]
        r = http.post(f"{API}/payout", headers=user_headers, json={"amountRupees": 10, "upi": "test@upi"})
        assert r.status_code == 200, r.text
        s = r.json()
        # 10 rupees * 100 pointsPerRupee = 1000 points
        assert s["user"]["points"] == pts_before - 1000
        assert any(p["status"] == "pending" and p["amountRupees"] == 10 for p in s["payouts"])

    def test_payout_invalid_upi_400(self, http, user_headers):
        r = http.post(f"{API}/payout", headers=user_headers, json={"amountRupees": 10, "upi": "bad-upi"})
        assert r.status_code == 400

    def test_payout_insufficient_points(self, http, user_headers):
        r = http.post(f"{API}/payout", headers=user_headers, json={"amountRupees": 999999, "upi": "test@upi"})
        assert r.status_code == 400


# ------------------- Admin guards -------------------
class TestAdminGuard:
    def test_wrong_admin_key_403(self, http):
        r = http.post(f"{API}/auth/admin-token", json={"admin_key": "wrong"})
        assert r.status_code == 403

    def test_admin_route_no_token_401(self, http):
        r = http.get(f"{API}/admin/dashboard")
        assert r.status_code == 401

    def test_admin_route_with_user_token_403(self, http, user_headers):
        r = http.get(f"{API}/admin/dashboard", headers=user_headers)
        assert r.status_code == 403

    def test_admin_users_with_user_token_403(self, http, user_headers):
        r = http.get(f"{API}/admin/users", headers=user_headers)
        assert r.status_code == 403


# ------------------- Admin actions -------------------
class TestAdminActions:
    def test_admin_dashboard(self, http, admin_headers):
        r = http.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "pendingCount", "pendingAmt", "paidCount", "paidAmt"):
            assert k in d
        assert d["users"] >= 1

    def test_admin_list_users(self, http, admin_headers, new_user):
        r = http.get(f"{API}/admin/users", headers=admin_headers)
        assert r.status_code == 200
        users_list = r.json()
        assert isinstance(users_list, list) and len(users_list) >= 1
        assert any(u["id"] == new_user["id"] for u in users_list)

    def test_admin_list_payouts(self, http, admin_headers):
        r = http.get(f"{API}/admin/payouts", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_adjust_points(self, http, admin_headers, user_headers, new_user):
        me_before = http.get(f"{API}/me", headers=user_headers).json()["user"]["points"]
        r = http.patch(f"{API}/admin/users/{new_user['id']}/points", headers=admin_headers, json={"delta": 250, "note": "TEST_bonus"})
        assert r.status_code == 200, r.text
        me_after = http.get(f"{API}/me", headers=user_headers).json()["user"]["points"]
        assert me_after == me_before + 250

    def test_admin_approve_payout(self, http, admin_headers, user_headers):
        # create a fresh pending payout
        http.post(f"{API}/earn", headers=user_headers, json={"gameId": None, "points": 2000, "title": "TEST payout topup2"})
        pr = http.post(f"{API}/payout", headers=user_headers, json={"amountRupees": 5, "upi": "test@upi"})
        assert pr.status_code == 200
        pid = pr.json()["payouts"][0]["id"]
        r = http.post(f"{API}/admin/payouts/{pid}/status", headers=admin_headers, json={"status": "successful"})
        assert r.status_code == 200, r.text
        # verify via /me
        state = http.get(f"{API}/me", headers=user_headers).json()
        matching = [p for p in state["payouts"] if p["id"] == pid]
        assert matching and matching[0]["status"] == "successful"

    def test_admin_reject_payout_refunds(self, http, admin_headers, user_headers):
        http.post(f"{API}/earn", headers=user_headers, json={"gameId": None, "points": 2000, "title": "TEST payout topup3"})
        pr = http.post(f"{API}/payout", headers=user_headers, json={"amountRupees": 3, "upi": "reject@upi"})
        assert pr.status_code == 200
        pid = pr.json()["payouts"][0]["id"]
        pts_after_req = pr.json()["user"]["points"]
        r = http.post(f"{API}/admin/payouts/{pid}/status", headers=admin_headers, json={"status": "failed", "reason": "TEST reject"})
        assert r.status_code == 200, r.text
        state = http.get(f"{API}/me", headers=user_headers).json()
        # refund of 3 * 100 = 300 points added back
        assert state["user"]["points"] == pts_after_req + 300
        matching = [p for p in state["payouts"] if p["id"] == pid]
        assert matching and matching[0]["status"] == "failed"

    def test_admin_broadcast_notify(self, http, admin_headers, user_headers):
        r = http.post(f"{API}/admin/notify", headers=admin_headers, json={"title": "TEST broadcast", "body": "hello"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("recipients", 0) >= 1
        # verify appears in user's notif feed
        time.sleep(0.5)
        state = http.get(f"{API}/me", headers=user_headers).json()
        assert any(n["title"] == "TEST broadcast" for n in state["notifs"])

    def test_admin_update_config(self, http, admin_headers):
        new_rewards = [11, 22, 33, 44, 55, 66, 77]
        r = http.put(f"{API}/admin/config", headers=admin_headers, json={"checkinRewards": new_rewards})
        assert r.status_code == 200
        assert r.json().get("checkinRewards") == new_rewards
        # revert
        r2 = http.put(f"{API}/admin/config", headers=admin_headers, json={"checkinRewards": [10, 20, 35, 50, 75, 100, 150]})
        assert r2.status_code == 200
