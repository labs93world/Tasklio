"""
Tasklio backend — cloud-backed accounts, wallet, payouts, notifications,
remote config, and a fully working admin control center.

Auth: custom JWT (bcrypt password hashes). Admin is a separate JWT scope
granted by verifying a server-side ADMIN_ACCESS_KEY (never shipped in the app
bundle). Push notifications go through the Emergent managed relay.
"""

import os
import re
import logging
import secrets
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import jwt
import bcrypt
import httpx
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator

ROOT_DIR = Path(__file__).parent
from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_ACCESS_KEY = os.environ["ADMIN_ACCESS_KEY"]
JWT_ALG = "HS256"
TOKEN_DAYS = 60

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users = db.users
txns = db.transactions
payouts = db.payouts
notifs = db.notifications

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("tasklio")

app = FastAPI(title="Tasklio")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Push relay (Emergent managed)
# ---------------------------------------------------------------------------
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
_push = httpx.AsyncClient(base_url=PUSH_BASE_URL, headers={"X-Push-Key": PUSH_KEY}, timeout=10.0)


async def send_push(recipients: list[str], data: dict, idempotency_key: str | None = None) -> None:
    if not recipients:
        return
    for i in range(0, len(recipients), 100):
        chunk = recipients[i : i + 100]
        payload: dict = {"recipients": chunk, "data": data}
        if idempotency_key:
            payload["$idempotency_key"] = f"{idempotency_key}:{i}"
        resp = await _push.post("/api/v1/push/trigger", json=payload)
        if resp.status_code == 401:
            raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
        if resp.status_code >= 500:
            raise HTTPException(502, "Push provider unavailable")
        resp.raise_for_status()


# ---------------------------------------------------------------------------
# Config (single remote-config document the app reads on every launch)
# ---------------------------------------------------------------------------
CONFIG_ID = "app_config"
GAME_IDS = ["spin", "puzzle", "quiz", "ttt", "hilo", "whack", "math", "n2048", "mine"]

DEFAULT_CONFIG = {
    "_id": CONFIG_ID,
    "checkinRewards": [10, 20, 35, 50, 75, 100, 150],
    "chancesPerAd": {g: 3 for g in GAME_IDS},
    "gameMaxReward": {g: 500 for g in GAME_IDS},
    "pointsPerRupee": 100,
    "chips": [100, 500, 1000],
    "banners": [
        {"title": "Fresh updates are waiting", "body": "Catch up on new rewards, community news, and account activity.", "icon": "bell-ring", "tint": "accentPuzzle", "route": "/notifications", "enabled": True},
        {"title": "Play. Earn. Cash out.", "body": "Turn your points into real UPI payouts, straight to your bank.", "icon": "wallet", "tint": "brandPrimary", "route": "/wallet", "enabled": True},
        {"title": "Daily Spin bonus", "body": "Spin the wheel every day and grab free bonus points.", "icon": "dice-5", "tint": "accentLucky", "route": "/games/spin", "enabled": True},
    ],
    "maintenance": {"global": False, "screens": {}},
    "forceUpdate": {"enabled": False, "minVersion": "1.0.0", "message": "A new version is available. Please update to continue."},
    "slideMenu": [
        {"icon": "share-variant", "label": "Share", "url": "app://share"},
        {"icon": "star-outline", "label": "Rate us", "url": "https://play.google.com/store/apps/details?id=com.altaftech.tasklio"},
        {"icon": "account-group", "label": "Join Community", "url": "https://t.me/tasklio93"},
        {"icon": "face-agent", "label": "Help & Support", "url": "mailto:labs93world@gmail.com?subject=About%20Tasklio%20App"},
        {"icon": "file-document-outline", "label": "Terms of use", "url": "/legal/terms"},
        {"icon": "shield-check-outline", "label": "Privacy Policy", "url": "/legal/privacy"},
    ],
}


async def get_config() -> dict:
    doc = await db.config.find_one({"_id": CONFIG_ID})
    if not doc:
        await db.config.insert_one(DEFAULT_CONFIG)
        doc = dict(DEFAULT_CONFIG)
    # backfill any missing keys (older docs)
    changed = False
    for k, v in DEFAULT_CONFIG.items():
        if k != "_id" and k not in doc:
            doc[k] = v
            changed = True
    if changed:
        await db.config.update_one({"_id": CONFIG_ID}, {"$set": {k: doc[k] for k in DEFAULT_CONFIG if k != "_id"}})
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except (ValueError, TypeError):
        return False


def make_token(sub: str, scope: str = "user") -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": sub, "scope": scope, "iat": now, "exp": now + timedelta(days=TOKEN_DAYS)},
        JWT_SECRET,
        algorithm=JWT_ALG,
    )


def today_key() -> str:
    d = datetime.now(timezone.utc)
    return f"{d.year}-{d.month}-{d.day}"


def yesterday_key() -> str:
    d = datetime.now(timezone.utc) - timedelta(days=1)
    return f"{d.year}-{d.month}-{d.day}"


async def _decode(creds: Optional[HTTPAuthorizationCredentials]):
    unauth = HTTPException(401, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    if not creds or creds.scheme.lower() != "bearer":
        raise unauth
    try:
        return jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise unauth


async def current_user(creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]):
    p = await _decode(creds)
    uid = p.get("sub")
    if not uid or not ObjectId.is_valid(uid):
        raise HTTPException(401, "Invalid token")
    u = await users.find_one({"_id": ObjectId(uid), "deleted_at": None})
    if not u:
        raise HTTPException(401, "Account not found")
    return u


async def admin_guard(creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]):
    p = await _decode(creds)
    if p.get("scope") != "admin":
        raise HTTPException(403, "Admin access required")
    return True


def public_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "name": u.get("name", ""),
        "mobile": u.get("mobile", ""),
        "points": u.get("points", 0),
        "chances": u.get("chances", {}),
        "checkin": u.get("checkin", {"lastClaim": "", "streak": 0}),
        "missions": u.get("missions", {"date": today_key(), "games": 0, "points": 0, "checkin": False}),
        "createdAt": u.get("created_at", now_ms()),
    }


async def user_txns(uid: ObjectId) -> list:
    out = []
    async for t in txns.find({"user_id": uid}).sort("ts", -1).limit(200):
        out.append({"id": str(t["_id"]), "kind": t["kind"], "title": t["title"], "points": t["points"], "ts": t["ts"]})
    return out


async def user_payouts(uid: ObjectId) -> list:
    out = []
    async for p in payouts.find({"user_id": uid}).sort("ts", -1):
        out.append({"id": str(p["_id"]), "amountRupees": p["amountRupees"], "upi": p["upi"], "status": p["status"], "ts": p["ts"], "reason": p.get("reason")})
    return out


async def user_notifs(uid: ObjectId) -> list:
    out = []
    async for n in notifs.find({"$or": [{"user_id": uid}, {"user_id": None}]}).sort("ts", -1).limit(100):
        read = n.get("read", False)
        if n.get("user_id") is None:
            read = uid in [ObjectId(x) for x in n.get("read_by", []) if ObjectId.is_valid(x)]
        out.append({"id": str(n["_id"]), "icon": n["icon"], "tintKey": n.get("tintKey", "brandPrimary"), "title": n["title"], "body": n["body"], "ts": n["ts"], "read": read, "pinned": n.get("pinned", False)})
    return out


async def full_state(u: dict) -> dict:
    uid = u["_id"]
    return {
        "user": public_user(u),
        "txns": await user_txns(uid),
        "payouts": await user_payouts(uid),
        "notifs": await user_notifs(uid),
        "config": await get_config(),
    }


def ensure_mission_day(u: dict) -> dict:
    m = u.get("missions") or {}
    if m.get("date") != today_key():
        u["missions"] = {"date": today_key(), "games": 0, "points": 0, "checkin": False}
    return u


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterBody(BaseModel):
    name: str
    mobile: str
    password: str = Field(min_length=4, max_length=128)

    @field_validator("mobile")
    @classmethod
    def ten(cls, v):
        if not re.fullmatch(r"\d{10}", v):
            raise ValueError("mobile must be 10 digits")
        return v


class LoginBody(BaseModel):
    mobile: str
    password: str


class AdminKeyBody(BaseModel):
    admin_key: str


class EarnBody(BaseModel):
    gameId: Optional[str] = None
    points: int
    title: str


class PayoutBody(BaseModel):
    amountRupees: float
    upi: str


class ChanceBody(BaseModel):
    gameId: str


class ProfileBody(BaseModel):
    name: str
    mobile: str


class RegisterPushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str


class AdminPointsBody(BaseModel):
    delta: int
    note: str = "Admin adjustment"


class AdminUserEditBody(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    password: Optional[str] = None


class AdminPayoutStatusBody(BaseModel):
    status: str  # successful | failed
    reason: Optional[str] = None


class AdminNotifyBody(BaseModel):
    title: str
    body: str
    userId: Optional[str] = None  # None => broadcast


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(b: RegisterBody):
    if await users.find_one({"mobile": b.mobile, "deleted_at": None}):
        raise HTTPException(409, "Mobile number already registered")
    doc = {
        "name": b.name.strip(),
        "mobile": b.mobile,
        "password_hash": hash_pw(b.password),
        "points": 0,
        "chances": {g: 3 for g in GAME_IDS},
        "checkin": {"lastClaim": "", "streak": 0},
        "missions": {"date": today_key(), "games": 0, "points": 0, "checkin": False},
        "created_at": now_ms(),
        "deleted_at": None,
    }
    res = await users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"token": make_token(str(res.inserted_id)), **await full_state(doc)}


@api.post("/auth/login")
async def login(b: LoginBody):
    u = await users.find_one({"mobile": b.mobile, "deleted_at": None})
    if not u or not verify_pw(b.password, u["password_hash"]):
        raise HTTPException(401, "Incorrect mobile number or password")
    return {"token": make_token(str(u["_id"])), **await full_state(u)}


@api.post("/auth/admin-token")
async def admin_token(b: AdminKeyBody):
    if not secrets.compare_digest(b.admin_key, ADMIN_ACCESS_KEY):
        raise HTTPException(403, "Invalid access key")
    return {"token": make_token("admin", "admin")}


@api.get("/me")
async def me(u=Depends(current_user)):
    return await full_state(u)


@api.get("/state")
async def state(u=Depends(current_user)):
    return await full_state(u)


@api.get("/config")
async def config_public():
    return await get_config()


@api.post("/profile")
async def set_profile(b: ProfileBody, u=Depends(current_user)):
    await users.update_one({"_id": u["_id"]}, {"$set": {"name": b.name.strip(), "mobile": b.mobile}})
    u = await users.find_one({"_id": u["_id"]})
    return await full_state(u)


# ---------------------------------------------------------------------------
# Gameplay / wallet routes
# ---------------------------------------------------------------------------
@api.post("/earn")
async def earn(b: EarnBody, u=Depends(current_user)):
    u = ensure_mission_day(u)
    m = u["missions"]
    updates = {"$inc": {"points": b.points}}
    m["points"] = m.get("points", 0) + (b.points if b.points > 0 else 0)
    await users.update_one({"_id": u["_id"]}, {"$inc": {"points": b.points}, "$set": {"missions": m}})
    if b.points != 0:
        await txns.insert_one({"user_id": u["_id"], "kind": "earn", "title": b.title, "points": b.points, "ts": now_ms()})
    u = await users.find_one({"_id": u["_id"]})
    return await full_state(u)


@api.post("/chances/consume")
async def consume_chance(b: ChanceBody, u=Depends(current_user)):
    u = ensure_mission_day(u)
    ch = u.get("chances", {})
    ch[b.gameId] = max(0, ch.get(b.gameId, 0) - 1)
    m = u["missions"]
    m["games"] = m.get("games", 0) + 1
    await users.update_one({"_id": u["_id"]}, {"$set": {"chances": ch, "missions": m}})
    u = await users.find_one({"_id": u["_id"]})
    return await full_state(u)


@api.post("/chances/add")
async def add_chance(b: ChanceBody, u=Depends(current_user)):
    cfg = await get_config()
    per = cfg["chancesPerAd"].get(b.gameId, 3)
    ch = u.get("chances", {})
    ch[b.gameId] = ch.get(b.gameId, 0) + per
    await users.update_one({"_id": u["_id"]}, {"$set": {"chances": ch}})
    u = await users.find_one({"_id": u["_id"]})
    return await full_state(u)


@api.post("/checkin")
async def checkin(u=Depends(current_user)):
    if u.get("checkin", {}).get("lastClaim") == today_key():
        raise HTTPException(400, "Already claimed today")
    cfg = await get_config()
    rewards = cfg["checkinRewards"]
    ck = u.get("checkin", {"lastClaim": "", "streak": 0})
    day = (ck.get("streak", 0) % 7) + 1 if ck.get("lastClaim") == yesterday_key() else 1
    reward = rewards[day - 1]
    u = ensure_mission_day(u)
    m = u["missions"]
    m["points"] = m.get("points", 0) + reward
    m["checkin"] = True
    await users.update_one(
        {"_id": u["_id"]},
        {"$inc": {"points": reward}, "$set": {"checkin": {"lastClaim": today_key(), "streak": day}, "missions": m}},
    )
    await txns.insert_one({"user_id": u["_id"], "kind": "earn", "title": f"Daily check-in · Day {day}", "points": reward, "ts": now_ms()})
    u = await users.find_one({"_id": u["_id"]})
    return {"reward": reward, "day": day, **await full_state(u)}


@api.post("/payout")
async def request_payout(b: PayoutBody, u=Depends(current_user)):
    if not re.fullmatch(r"[\w.\-]{2,}@[\w.\-]{2,}", b.upi):
        raise HTTPException(400, "Enter a valid UPI ID (name@bank)")
    cfg = await get_config()
    cost = round(b.amountRupees * cfg["pointsPerRupee"])
    if u.get("points", 0) < cost:
        raise HTTPException(400, "Not enough points for this payout")
    await users.update_one({"_id": u["_id"]}, {"$inc": {"points": -cost}})
    await payouts.insert_one({"user_id": u["_id"], "amountRupees": b.amountRupees, "upi": b.upi, "status": "pending", "ts": now_ms()})
    await txns.insert_one({"user_id": u["_id"], "kind": "payout", "title": f"Payout to {b.upi}", "points": -cost, "ts": now_ms()})
    u = await users.find_one({"_id": u["_id"]})
    return await full_state(u)


@api.post("/notifications/read-all")
async def read_all(u=Depends(current_user)):
    await notifs.update_many({"user_id": u["_id"]}, {"$set": {"read": True}})
    await notifs.update_many({"user_id": None}, {"$addToSet": {"read_by": str(u["_id"])}})
    u = await users.find_one({"_id": u["_id"]})
    return await full_state(u)


@api.post("/notifications/{nid}/read")
async def read_one(nid: str, u=Depends(current_user)):
    if ObjectId.is_valid(nid):
        oid = ObjectId(nid)
        await notifs.update_one({"_id": oid, "user_id": u["_id"]}, {"$set": {"read": True}})
        await notifs.update_one({"_id": oid, "user_id": None}, {"$addToSet": {"read_by": str(u["_id"])}})
    u = await users.find_one({"_id": u["_id"]})
    return await full_state(u)


@api.post("/register-push", status_code=201)
async def register_push(b: RegisterPushBody):
    resp = await _push.post("/api/v1/push/users/register", json=b.model_dump())
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()
    return {"status": "registered"}


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------
async def admin_user_detail(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "name": u.get("name", ""),
        "mobile": u.get("mobile", ""),
        "points": u.get("points", 0),
        "createdAt": u.get("created_at", now_ms()),
        "txns": await user_txns(u["_id"]),
        "payouts": await user_payouts(u["_id"]),
    }


@api.get("/admin/dashboard")
async def admin_dashboard(_=Depends(admin_guard)):
    total_users = await users.count_documents({"deleted_at": None})
    pending = payouts.find({"status": "pending"})
    paid = payouts.find({"status": "successful"})
    pc = pa = kc = ka = 0
    async for p in pending:
        pc += 1
        pa += p["amountRupees"]
    async for p in paid:
        kc += 1
        ka += p["amountRupees"]
    return {"users": total_users, "pendingCount": pc, "pendingAmt": pa, "paidCount": kc, "paidAmt": ka}


@api.get("/admin/users")
async def admin_list_users(q: str = "", _=Depends(admin_guard)):
    query: dict = {"deleted_at": None}
    if q.strip():
        query["mobile"] = {"$regex": re.escape(q.strip())}
    out = []
    async for u in users.find(query).sort("created_at", -1).limit(200):
        out.append(await admin_user_detail(u))
    return out


@api.get("/admin/payouts")
async def admin_payouts(_=Depends(admin_guard)):
    out = []
    async for p in payouts.find({}).sort("ts", -1).limit(300):
        u = await users.find_one({"_id": p["user_id"]})
        out.append({
            "id": str(p["_id"]),
            "amountRupees": p["amountRupees"],
            "upi": p["upi"],
            "status": p["status"],
            "ts": p["ts"],
            "reason": p.get("reason"),
            "user": {"id": str(u["_id"]), "name": u.get("name", ""), "mobile": u.get("mobile", "")} if u else None,
        })
    return out


@api.patch("/admin/users/{uid}/points")
async def admin_adjust_points(uid: str, b: AdminPointsBody, _=Depends(admin_guard)):
    if not ObjectId.is_valid(uid):
        raise HTTPException(400, "Invalid user id")
    u = await users.find_one_and_update({"_id": ObjectId(uid)}, {"$inc": {"points": b.delta}}, return_document=True)
    if not u:
        raise HTTPException(404, "User not found")
    if u.get("points", 0) < 0:
        await users.update_one({"_id": ObjectId(uid)}, {"$set": {"points": 0}})
    await txns.insert_one({"user_id": ObjectId(uid), "kind": "adjust", "title": b.note, "points": b.delta, "ts": now_ms()})
    await notifs.insert_one({"user_id": ObjectId(uid), "icon": "star-four-points", "tintKey": "brandPrimary", "title": "Points updated", "body": f"{'+' if b.delta >= 0 else ''}{b.delta} points · {b.note}", "ts": now_ms(), "read": False})
    try:
        await send_push([uid], {"title": "Points updated", "message": f"{'+' if b.delta >= 0 else ''}{b.delta} points added by admin."})
    except Exception as e:
        logger.warning(f"push failed (non-blocking): {e}")
    return await admin_user_detail(await users.find_one({"_id": ObjectId(uid)}))


@api.patch("/admin/users/{uid}")
async def admin_edit_user(uid: str, b: AdminUserEditBody, _=Depends(admin_guard)):
    if not ObjectId.is_valid(uid):
        raise HTTPException(400, "Invalid user id")
    upd: dict = {}
    if b.name is not None:
        upd["name"] = b.name.strip()
    if b.mobile is not None:
        if not re.fullmatch(r"\d{10}", b.mobile):
            raise HTTPException(400, "mobile must be 10 digits")
        upd["mobile"] = b.mobile
    if b.password:
        upd["password_hash"] = hash_pw(b.password)
    if upd:
        await users.update_one({"_id": ObjectId(uid)}, {"$set": upd})
    return await admin_user_detail(await users.find_one({"_id": ObjectId(uid)}))


@api.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, _=Depends(admin_guard)):
    if not ObjectId.is_valid(uid):
        raise HTTPException(400, "Invalid user id")
    await users.update_one({"_id": ObjectId(uid)}, {"$set": {"deleted_at": now_ms()}})
    return {"ok": True}


@api.post("/admin/payouts/{pid}/status")
async def admin_payout_status(pid: str, b: AdminPayoutStatusBody, _=Depends(admin_guard)):
    if not ObjectId.is_valid(pid) or b.status not in ("successful", "failed"):
        raise HTTPException(400, "Invalid request")
    p = await payouts.find_one({"_id": ObjectId(pid)})
    if not p:
        raise HTTPException(404, "Payout not found")
    if p["status"] != "pending":
        raise HTTPException(400, "Payout already processed")
    cfg = await get_config()
    set_fields: dict = {"status": b.status}
    if b.reason:
        set_fields["reason"] = b.reason
    await payouts.update_one({"_id": ObjectId(pid)}, {"$set": set_fields})
    uid = p["user_id"]
    if b.status == "successful":
        await notifs.insert_one({"user_id": uid, "icon": "check-decagram", "tintKey": "success", "title": "Withdrawal successful", "body": f"₹{p['amountRupees']:.2f} to {p['upi']} has been credited.", "ts": now_ms(), "read": False})
        push = {"title": "Withdrawal successful", "message": f"₹{p['amountRupees']:.2f} credited to {p['upi']}."}
    else:
        refund = round(p["amountRupees"] * cfg["pointsPerRupee"])
        await users.update_one({"_id": uid}, {"$inc": {"points": refund}})
        await txns.insert_one({"user_id": uid, "kind": "payout", "title": f"Payout rejected · refund for {p['upi']}", "points": refund, "ts": now_ms()})
        await notifs.insert_one({"user_id": uid, "icon": "close-octagon", "tintKey": "error", "title": "Withdrawal rejected", "body": f"₹{p['amountRupees']:.2f} to {p['upi']} was rejected. Points refunded.", "ts": now_ms(), "read": False})
        push = {"title": "Withdrawal rejected", "message": f"₹{p['amountRupees']:.2f} rejected. Your points were refunded."}
    try:
        await send_push([str(uid)], push)
    except Exception as e:
        logger.warning(f"push failed (non-blocking): {e}")
    return {"ok": True}


@api.post("/admin/notify")
async def admin_notify(b: AdminNotifyBody, _=Depends(admin_guard)):
    ts = now_ms()
    if b.userId:
        if not ObjectId.is_valid(b.userId):
            raise HTTPException(400, "Invalid user id")
        await notifs.insert_one({"user_id": ObjectId(b.userId), "icon": "bullhorn", "tintKey": "accentQuiz", "title": b.title, "body": b.body, "ts": ts, "read": False, "pinned": True})
        recipients = [b.userId]
    else:
        await notifs.insert_one({"user_id": None, "icon": "bullhorn", "tintKey": "accentQuiz", "title": b.title, "body": b.body, "ts": ts, "read": False, "pinned": True, "read_by": []})
        recipients = [str(u["_id"]) async for u in users.find({"deleted_at": None}, {"_id": 1})]
    sent = 0
    try:
        await send_push(recipients, {"title": b.title, "message": b.body})
        sent = len(recipients)
    except Exception as e:
        logger.warning(f"push failed (non-blocking): {e}")
    return {"ok": True, "recipients": len(recipients), "pushed": sent}


@api.put("/admin/config")
async def admin_update_config(body: dict, _=Depends(admin_guard)):
    allowed = {k for k in DEFAULT_CONFIG if k != "_id"}
    upd = {k: v for k, v in body.items() if k in allowed}
    if upd:
        await db.config.update_one({"_id": CONFIG_ID}, {"$set": upd}, upsert=True)
    return await get_config()


# ---------------------------------------------------------------------------
# Health + wiring
# ---------------------------------------------------------------------------
@api.get("/")
async def api_root():
    return {"status": "ok", "app": "Tasklio", "mode": "cloud"}


@api.get("/health")
async def api_health():
    return {"status": "healthy", "time": datetime.now(timezone.utc).isoformat()}


app.include_router(api)


@app.get("/health")
async def root_health():
    return {"status": "healthy", "time": datetime.now(timezone.utc).isoformat()}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await users.create_index("mobile")
    await get_config()
    logger.info("Tasklio backend ready (cloud mode)")


@app.on_event("shutdown")
async def shutdown():
    client.close()
    await _push.aclose()
