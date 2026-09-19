import os
import re
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from db import db, now_iso, log_activity

ALG = "HS256"
SIGNUP_ROLES = {"collector", "recycler"}
TOKEN_TTL = timedelta(days=7)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role, "type": "access", "exp": datetime.now(timezone.utc) + TOKEN_TTL}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=ALG)


def public_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc["name"],
        "role": doc["role"],
        "wallet_balance": round(float(doc.get("wallet_balance", 0)), 2),
        "lat": doc.get("lat"),
        "lng": doc.get("lng"),
        "phone": doc.get("phone") or "",
        "alert_channel": doc.get("alert_channel") or "sms",
        "created_at": doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token and request.query_params.get("auth"):
        token = request.query_params["auth"]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return public_user(user)


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions for this role")
        return user
    return dep


router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str
    phone: str = ""


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"[^\d+]", "", raw or "")
    if not digits:
        return ""
    if not digits.startswith("+"):
        digits = "+91" + digits if len(digits) == 10 else "+" + digits
    if not re.fullmatch(r"\+[1-9]\d{7,14}", digits):
        raise HTTPException(status_code=400, detail="Phone must be in international format, e.g. +919876543210")
    return digits


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _set_cookie(response: Response, token: str):
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=int(TOKEN_TTL.total_seconds()), path="/")


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    if body.role not in SIGNUP_ROLES:
        raise HTTPException(status_code=400, detail="Role must be collector or recycler")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"email": email, "name": body.name.strip(), "role": body.role, "password_hash": hash_password(body.password), "wallet_balance": 0.0,
           "phone": normalize_phone(body.phone), "alert_channel": "sms", "created_at": now_iso()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    user = public_user(doc)
    token = create_access_token(user["id"], user["email"], user["role"])
    _set_cookie(response, token)
    await log_activity(user, "user.registered", f"{user['name']} joined as {user['role']}")
    return {"token": token, "user": user}


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else 'unknown'}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("locked_until") and attempt["locked_until"] > now_iso():
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": count, "locked_until": None}
        if count >= 5:
            update = {"count": 0, "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}
        await db.login_attempts.update_one({"identifier": ident}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    pub = public_user(user)
    token = create_access_token(pub["id"], pub["email"], pub["role"])
    _set_cookie(response, token)
    await log_activity(pub, "user.login", f"{pub['name']} signed in")
    return {"token": token, "user": pub}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}
