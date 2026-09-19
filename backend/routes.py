import os
import math
import uuid
import secrets
import asyncio
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Response
from pydantic import BaseModel, Field
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
from db import db, now_iso, log_activity
from auth import get_current_user, require_role, public_user, normalize_phone
from models import Listing
from pricing import PRICE_TABLE, CONDITION_MULT, categorize, estimate
from storage import put_object, get_object
from ai import analyze_photo
from notify import notify, twilio_config


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)), 1)


def with_distance(item: dict, lat, lng) -> dict:
    if lat is not None and lng is not None and item.get("lat") is not None and item.get("lng") is not None:
        item["distance_km"] = haversine_km(lat, lng, item["lat"], item["lng"])
    else:
        item["distance_km"] = None
    return item

router = APIRouter(prefix="/api")
APP_NAME = "recircuit"
ALLOWED_IMG = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD = 8 * 1024 * 1024
SOLD = {"$in": ["paid", "completed"]}


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")


def serialize(doc: dict) -> dict:
    return Listing.from_mongo(doc).model_dump()


async def get_listing(listing_id: str) -> dict:
    doc = await db.listings.find_one({"_id": oid(listing_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    return doc


def stripe_client(request: Request) -> StripeCheckout:
    host_url = str(request.base_url)
    return StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=f"{host_url}api/webhook/stripe")


@router.get("/")
async def health():
    return {"service": "ReCircuit API", "status": "ok"}


@router.get("/stats")
async def public_stats():
    sold = await db.listings.find({"status": SOLD}).to_list(10000)
    return {
        "total_kg": round(sum(l["weight_kg"] for l in sold), 1),
        "rupees_paid": round(sum(l["estimated_price"] for l in sold), 2),
        "collectors": await db.users.count_documents({"role": "collector"}),
        "recyclers": await db.users.count_documents({"role": "recycler"}),
        "listings": await db.listings.count_documents({}),
        "lots_completed": len(sold),
    }


@router.get("/categories")
async def categories():
    return {
        "categories": [{"key": k, "label": v["label"], "per_kg": v["per_kg"]} for k, v in PRICE_TABLE.items()],
        "conditions": [{"key": k, "multiplier": v} for k, v in CONDITION_MULT.items()],
    }


class CategorizeIn(BaseModel):
    text: str = Field(min_length=2, max_length=600)


@router.post("/categorize")
async def categorize_item(body: CategorizeIn, user: dict = Depends(get_current_user)):
    return categorize(body.text)


class EstimateIn(BaseModel):
    category: str
    weight_kg: float = Field(gt=0, le=5000)
    condition: str = "repairable"


@router.post("/estimate")
async def estimate_price(body: EstimateIn, user: dict = Depends(get_current_user)):
    return estimate(body.category, body.weight_kg, body.condition)


class PhotoCategorizeIn(BaseModel):
    photo_path: str
    hint: str = Field(default="", max_length=600)


@router.post("/categorize/photo")
async def categorize_photo(body: PhotoCategorizeIn, user: dict = Depends(get_current_user)):
    record = await db.files.find_one({"storage_path": body.photo_path, "is_deleted": False})
    if not record or (record.get("owner_id") != user["id"] and user["role"] != "admin"):
        raise HTTPException(status_code=404, detail="Photo not found")
    try:
        data, _ = await asyncio.to_thread(get_object, body.photo_path)
        result = await analyze_photo(data, body.hint.strip())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {e}")
    await log_activity(user, "ai.categorized", f"AI classified photo as {result['label']} · ~{result['weight_kg']} kg ({int(result['confidence'] * 100)}%)")
    return result


class LocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


@router.put("/me/location")
async def set_my_location(body: LocationIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"lat": body.lat, "lng": body.lng}})
    return public_user(await db.users.find_one({"_id": ObjectId(user["id"])}))


class ProfileIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=60)
    phone: Optional[str] = None
    alert_channel: Optional[str] = None


@router.put("/me/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    update = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.phone is not None:
        update["phone"] = normalize_phone(body.phone)
    if body.alert_channel is not None:
        if body.alert_channel not in ("sms", "whatsapp"):
            raise HTTPException(status_code=400, detail="alert_channel must be sms or whatsapp")
        update["alert_channel"] = body.alert_channel
    if update:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return public_user(await db.users.find_one({"_id": ObjectId(user["id"])}))


@router.get("/alerts/config")
async def alerts_config():
    cfg = twilio_config()
    return {"sms_enabled": cfg["enabled"], "whatsapp_enabled": cfg["whatsapp_enabled"]}


@router.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    items = [{**{k: v for k, v in d.items() if k != "_id"}, "id": str(d["_id"])} for d in docs]
    return {"items": items, "unread": sum(1 for d in items if not d["read"])}


@router.post("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


@router.get("/map")
async def map_data(lat: Optional[float] = None, lng: Optional[float] = None, user: dict = Depends(get_current_user)):
    lots = await db.listings.find({"status": "open", "lat": {"$ne": None}}).sort("created_at", -1).to_list(500)
    recyclers = await db.users.find({"role": "recycler", "lat": {"$ne": None}}).to_list(500)
    return {
        "lots": sorted([with_distance(serialize(d), lat, lng) for d in lots], key=lambda x: (x["distance_km"] is None, x["distance_km"] or 0)),
        "recyclers": sorted([with_distance({"id": str(r["_id"]), "name": r["name"], "lat": r["lat"], "lng": r["lng"]}, lat, lng) for r in recyclers], key=lambda x: (x["distance_km"] is None, x["distance_km"] or 0)),
    }


@router.post("/upload")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMG:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP or GIF images are allowed")
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=400, detail="Image must be under 8 MB")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    try:
        result = await asyncio.to_thread(put_object, path, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")
    await db.files.insert_one({
        "storage_path": result["path"], "original_filename": file.filename, "content_type": content_type,
        "size": result.get("size", len(data)), "owner_id": user["id"], "is_deleted": False, "created_at": now_iso(),
    })
    return {"path": result["path"], "size": result.get("size", len(data))}


@router.get("/files/{path:path}")
async def serve_file(path: str, user: dict = Depends(get_current_user)):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = await asyncio.to_thread(get_object, path)
    except Exception:
        raise HTTPException(status_code=502, detail="Storage fetch failed")
    return Response(content=data, media_type=record.get("content_type", content_type), headers={"Cache-Control": "private, max-age=3600"})


class ListingIn(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=600)
    location: str = Field(default="", max_length=80)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    category: str
    weight_kg: float = Field(gt=0, le=5000)
    condition: str = "repairable"
    photo_path: Optional[str] = None


@router.post("/listings", status_code=201)
async def create_listing(body: ListingIn, user: dict = Depends(require_role("collector"))):
    if body.category not in PRICE_TABLE:
        raise HTTPException(status_code=400, detail="Unknown category")
    est = estimate(body.category, body.weight_kg, body.condition)
    listing = Listing(
        collector_id=user["id"], collector_name=user["name"], title=body.title.strip(), description=body.description.strip(),
        location=body.location.strip(), lat=body.lat, lng=body.lng, category=est["category"], category_label=est["label"], weight_kg=body.weight_kg,
        condition=est["condition"], photo_path=body.photo_path, price_per_kg=est["price_per_kg"], multiplier=est["multiplier"],
        estimated_price=est["estimated_price"], created_at=now_iso(),
    )
    res = await db.listings.insert_one(listing.to_mongo())
    await log_activity(user, "listing.created", f"Listed '{listing.title}' · {listing.weight_kg} kg {listing.category_label} for ₹{listing.estimated_price}", str(res.inserted_id), listing.estimated_price)
    return serialize(await db.listings.find_one({"_id": res.inserted_id}))


@router.get("/listings/mine")
async def my_listings(user: dict = Depends(require_role("collector"))):
    docs = await db.listings.find({"collector_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]


@router.get("/listings/open")
async def open_listings(lat: Optional[float] = None, lng: Optional[float] = None, user: dict = Depends(require_role("recycler", "admin"))):
    docs = await db.listings.find({"status": "open"}).sort("created_at", -1).to_list(500)
    items = [with_distance(serialize(d), lat, lng) for d in docs]
    if lat is not None and lng is not None:
        items.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"] or 0))
    return items


@router.get("/listings/purchases")
async def my_purchases(user: dict = Depends(require_role("recycler"))):
    docs = await db.listings.find({"recycler_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]


@router.get("/listings/{listing_id}")
async def listing_detail(listing_id: str, user: dict = Depends(get_current_user)):
    doc = await get_listing(listing_id)
    if user["role"] != "admin" and user["id"] not in (doc["collector_id"], doc.get("recycler_id")) and doc["status"] != "open":
        raise HTTPException(status_code=403, detail="Not a participant of this listing")
    return serialize(doc)


@router.post("/listings/{listing_id}/match")
async def match_listing(listing_id: str, user: dict = Depends(require_role("recycler"))):
    doc = await get_listing(listing_id)
    if doc["status"] != "open":
        raise HTTPException(status_code=400, detail="This lot is no longer open")
    await db.listings.update_one({"_id": doc["_id"], "status": "open"}, {"$set": {"status": "matched", "recycler_id": user["id"], "recycler_name": user["name"], "matched_at": now_iso()}})
    await log_activity(user, "listing.matched", f"{user['name']} matched with '{doc['title']}'", listing_id, doc["estimated_price"])
    await notify(doc["collector_id"], "Your lot got matched", f"{user['name']} matched '{doc['title']}' ({doc['weight_kg']} kg) for ₹{doc['estimated_price']}. Payment is next.", listing_id, "match")
    return serialize(await get_listing(listing_id))


class PickupProposeIn(BaseModel):
    slots: list[str] = Field(min_length=1, max_length=3)


def parse_slot(value: str) -> str:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date/time: {value}")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    if dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Pickup slots must be in the future")
    return dt.isoformat()


def fmt_slot(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%a %d %b, %H:%M UTC")


@router.post("/listings/{listing_id}/pickup/propose")
async def propose_pickup(listing_id: str, body: PickupProposeIn, user: dict = Depends(require_role("recycler"))):
    doc = await get_listing(listing_id)
    if doc.get("recycler_id") != user["id"] or doc["status"] not in ("matched", "paid"):
        raise HTTPException(status_code=400, detail="Pickup can be proposed on your matched or paid lots only")
    slots = sorted({parse_slot(s) for s in body.slots})
    await db.listings.update_one({"_id": doc["_id"]}, {"$set": {"pickup_slots": slots, "pickup_at": None, "pickup_status": "proposed"}})
    await log_activity(user, "pickup.proposed", f"{user['name']} proposed {len(slots)} pickup slot(s) for '{doc['title']}'", listing_id)
    await notify(doc["collector_id"], "Pickup slots proposed", f"{user['name']} proposed pickup for '{doc['title']}': " + " · ".join(fmt_slot(s) for s in slots) + ". Confirm one in the app.", listing_id, "pickup")
    return serialize(await get_listing(listing_id))


class PickupConfirmIn(BaseModel):
    slot: str


@router.post("/listings/{listing_id}/pickup/confirm")
async def confirm_pickup(listing_id: str, body: PickupConfirmIn, user: dict = Depends(require_role("collector"))):
    doc = await get_listing(listing_id)
    if doc["collector_id"] != user["id"] or doc.get("pickup_status") != "proposed":
        raise HTTPException(status_code=400, detail="No pending pickup proposal on this lot")
    if body.slot not in doc.get("pickup_slots", []):
        raise HTTPException(status_code=400, detail="Pick one of the proposed slots")
    await db.listings.update_one({"_id": doc["_id"]}, {"$set": {"pickup_at": body.slot, "pickup_status": "confirmed"}})
    await log_activity(user, "pickup.confirmed", f"{user['name']} confirmed pickup {fmt_slot(body.slot)} for '{doc['title']}'", listing_id)
    await notify(doc["recycler_id"], "Pickup confirmed", f"{user['name']} confirmed pickup of '{doc['title']}' on {fmt_slot(body.slot)}.", listing_id, "pickup")
    return serialize(await get_listing(listing_id))


@router.post("/listings/{listing_id}/pickup/decline")
async def decline_pickup(listing_id: str, user: dict = Depends(require_role("collector"))):
    doc = await get_listing(listing_id)
    if doc["collector_id"] != user["id"] or doc.get("pickup_status") != "proposed":
        raise HTTPException(status_code=400, detail="No pending pickup proposal on this lot")
    await db.listings.update_one({"_id": doc["_id"]}, {"$set": {"pickup_slots": [], "pickup_at": None, "pickup_status": "declined"}})
    await log_activity(user, "pickup.declined", f"{user['name']} asked for other pickup slots for '{doc['title']}'", listing_id)
    await notify(doc["recycler_id"], "New pickup slots requested", f"{user['name']} can't make the proposed slots for '{doc['title']}'. Please propose new ones.", listing_id, "pickup")
    return serialize(await get_listing(listing_id))


class CheckoutIn(BaseModel):
    origin_url: str


@router.post("/listings/{listing_id}/checkout")
async def checkout_listing(listing_id: str, body: CheckoutIn, request: Request, user: dict = Depends(require_role("recycler"))):
    doc = await get_listing(listing_id)
    if doc["status"] != "matched" or doc.get("recycler_id") != user["id"]:
        raise HTTPException(status_code=400, detail="Only the matched recycler can pay for a matched lot")
    amount = float(doc["estimated_price"])
    origin = body.origin_url.rstrip("/")
    req = CheckoutSessionRequest(
        amount=amount, currency="inr",
        success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/payment/cancel",
        metadata={"listing_id": listing_id, "recycler_id": user["id"], "collector_id": doc["collector_id"], "title": doc["title"]},
    )
    try:
        session = await stripe_client(request).create_checkout_session(req)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe checkout failed: {e}")
    await db.payment_transactions.insert_one({
        "session_id": session.session_id, "listing_id": listing_id, "recycler_id": user["id"], "collector_id": doc["collector_id"],
        "amount": amount, "currency": "inr", "status": "initiated", "payment_status": "pending", "created_at": now_iso(), "updated_at": now_iso(),
    })
    await db.listings.update_one({"_id": doc["_id"]}, {"$set": {"payment_session_id": session.session_id}})
    await log_activity(user, "payment.initiated", f"Stripe checkout started for '{doc['title']}' · ₹{amount}", listing_id, amount)
    return {"checkout_url": session.url, "session_id": session.session_id}


async def finalize_payment(session_id: str):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        return
    res = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now_iso()}},
    )
    if res.modified_count == 0:
        return
    listing = await db.listings.find_one({"_id": ObjectId(txn["listing_id"])})
    if not listing:
        return
    await db.listings.update_one({"_id": listing["_id"]}, {"$set": {"status": "paid", "paid_at": now_iso()}})
    await db.users.update_one({"_id": ObjectId(txn["collector_id"])}, {"$inc": {"wallet_balance": txn["amount"]}})
    await db.ledger.insert_one({
        "user_id": txn["collector_id"], "type": "credit", "amount": txn["amount"], "listing_id": txn["listing_id"],
        "title": listing["title"], "counterparty": listing.get("recycler_name"), "session_id": session_id, "created_at": now_iso(),
    })
    recycler = await db.users.find_one({"_id": ObjectId(txn["recycler_id"])})
    actor = {"id": txn["recycler_id"], "name": recycler["name"] if recycler else "Recycler", "role": "recycler"}
    provider = txn.get("provider", "stripe").capitalize()
    await log_activity(actor, "payment.completed", f"₹{txn['amount']} paid via {provider} for '{listing['title']}' · collector wallet credited", txn["listing_id"], txn["amount"])
    await notify(txn["collector_id"], "Payment received", f"₹{txn['amount']} for '{listing['title']}' was paid via {provider} by {actor['name']}. Your wallet has been credited.", txn["listing_id"], "payment")


@router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn["payment_status"] != "paid":
        try:
            st = await stripe_client(request).get_checkout_status(session_id)
            if st.payment_status == "paid":
                await finalize_payment(session_id)
            elif st.status == "expired":
                await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"status": "expired", "payment_status": "expired", "updated_at": now_iso()}})
        except Exception:
            pass
        txn = await db.payment_transactions.find_one({"session_id": session_id})
    return {"session_id": session_id, "status": txn["status"], "payment_status": txn["payment_status"], "listing_id": txn["listing_id"], "amount": txn["amount"]}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    try:
        event = await stripe_client(request).handle_webhook(body, sig)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")
    if event.payment_status == "paid":
        await finalize_payment(event.session_id)
    return {"status": "ok"}


@router.post("/listings/{listing_id}/handover")
async def handover(listing_id: str, user: dict = Depends(require_role("collector", "recycler"))):
    doc = await get_listing(listing_id)
    if user["id"] not in (doc["collector_id"], doc.get("recycler_id")):
        raise HTTPException(status_code=403, detail="Not a participant of this listing")
    if doc["status"] != "paid":
        raise HTTPException(status_code=400, detail="Handover can only be recorded after payment")
    code = f"EW-{secrets.token_hex(3).upper()}"
    await db.listings.update_one({"_id": doc["_id"]}, {"$set": {"status": "completed", "handover_code": code, "handover_at": now_iso()}})
    await log_activity(user, "handover.recorded", f"Digital handover {code} for '{doc['title']}'", listing_id, doc["estimated_price"])
    other = doc["recycler_id"] if user["id"] == doc["collector_id"] else doc["collector_id"]
    await notify(other, "Handover recorded", f"Digital handover {code} recorded for '{doc['title']}' by {user['name']}. Lot completed.", listing_id, "handover")
    return serialize(await get_listing(listing_id))


@router.get("/wallet")
async def wallet(user: dict = Depends(require_role("collector"))):
    entries = await db.ledger.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"balance": round(float(fresh.get("wallet_balance", 0)), 2), "entries": entries}


@router.get("/admin/overview")
async def admin_overview(user: dict = Depends(require_role("admin"))):
    sold = await db.listings.find({"status": SOLD}).to_list(10000)
    today = datetime.now(timezone.utc).date()
    per_day = defaultdict(lambda: {"kg": 0.0, "rupees": 0.0})
    for l in sold:
        day = (l.get("paid_at") or l["created_at"])[:10]
        per_day[day]["kg"] += l["weight_kg"]
        per_day[day]["rupees"] += l["estimated_price"]
    chart = []
    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        v = per_day[d.isoformat()]
        chart.append({"date": d.strftime("%b %d"), "kg": round(v["kg"], 1), "rupees": round(v["rupees"], 2)})
    recent_logs = await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(8)
    recent_listings = await db.listings.find({}).sort("created_at", -1).to_list(6)
    return {
        "kpis": {
            "total_kg": round(sum(l["weight_kg"] for l in sold), 1),
            "rupees_paid": round(sum(l["estimated_price"] for l in sold), 2),
            "active_lots": await db.listings.count_documents({"status": {"$in": ["open", "matched"]}}),
            "users": await db.users.count_documents({}),
            "collectors": await db.users.count_documents({"role": "collector"}),
            "recyclers": await db.users.count_documents({"role": "recycler"}),
            "lots_completed": await db.listings.count_documents({"status": "completed"}),
        },
        "chart": chart,
        "recent_logs": recent_logs,
        "recent_listings": [serialize(d) for d in recent_listings],
    }


@router.get("/admin/logs")
async def admin_logs(user: dict = Depends(require_role("admin"))):
    return await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}).sort("created_at", -1).to_list(500)
    out = []
    for u in users:
        out.append({
            "id": str(u["_id"]), "name": u["name"], "email": u["email"], "role": u["role"],
            "wallet_balance": round(float(u.get("wallet_balance", 0)), 2), "created_at": u.get("created_at"),
            "listings": await db.listings.count_documents({"$or": [{"collector_id": str(u["_id"])}, {"recycler_id": str(u["_id"])}]}),
        })
    return out
