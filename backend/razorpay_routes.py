import os
import hmac
import json
import asyncio
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import razorpay
from db import db, now_iso, log_activity
from auth import require_role
from routes import get_listing, finalize_payment

router = APIRouter(prefix="/api")


def rz_keys():
    return (os.environ.get("RAZORPAY_KEY_ID") or "").strip(), (os.environ.get("RAZORPAY_KEY_SECRET") or "").strip()


def rz_client() -> razorpay.Client:
    kid, secret = rz_keys()
    if not kid or not secret:
        raise HTTPException(status_code=503, detail="Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env")
    return razorpay.Client(auth=(kid, secret))


@router.get("/payments/config")
async def payments_config():
    kid, secret = rz_keys()
    return {"stripe_enabled": bool(os.environ.get("STRIPE_API_KEY")), "razorpay_enabled": bool(kid and secret), "razorpay_key_id": kid}


@router.post("/listings/{listing_id}/razorpay/order")
async def razorpay_order(listing_id: str, user: dict = Depends(require_role("recycler"))):
    doc = await get_listing(listing_id)
    if doc["status"] != "matched" or doc.get("recycler_id") != user["id"]:
        raise HTTPException(status_code=400, detail="Only the matched recycler can pay for a matched lot")
    client = rz_client()
    amount_paise = int(round(float(doc["estimated_price"]) * 100))
    try:
        order = await asyncio.to_thread(client.order.create, {
            "amount": amount_paise, "currency": "INR", "receipt": f"lot_{listing_id}"[:40], "payment_capture": 1,
            "notes": {"listing_id": listing_id, "recycler_id": user["id"], "collector_id": doc["collector_id"]},
        })
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order failed: {e}")
    await db.payment_transactions.insert_one({
        "session_id": order["id"], "provider": "razorpay", "listing_id": listing_id, "recycler_id": user["id"], "collector_id": doc["collector_id"],
        "amount": float(doc["estimated_price"]), "currency": "inr", "status": "initiated", "payment_status": "pending", "created_at": now_iso(), "updated_at": now_iso(),
    })
    await log_activity(user, "payment.initiated", f"Razorpay order created for '{doc['title']}' · ₹{doc['estimated_price']}", listing_id, doc["estimated_price"])
    return {
        "order_id": order["id"], "amount": amount_paise, "currency": "INR", "key_id": rz_keys()[0], "name": "ReCircuit",
        "description": doc["title"], "prefill": {"name": user["name"], "email": user["email"]},
    }


class RazorpayVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/payments/razorpay/verify")
async def razorpay_verify(body: RazorpayVerifyIn, user: dict = Depends(require_role("recycler"))):
    client = rz_client()
    try:
        client.utility.verify_payment_signature(body.model_dump())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature")
    txn = await db.payment_transactions.find_one({"session_id": body.razorpay_order_id, "recycler_id": user["id"]})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.payment_transactions.update_one({"session_id": body.razorpay_order_id}, {"$set": {"razorpay_payment_id": body.razorpay_payment_id}})
    await finalize_payment(body.razorpay_order_id)
    txn = await db.payment_transactions.find_one({"session_id": body.razorpay_order_id})
    return {"session_id": body.razorpay_order_id, "status": txn["status"], "payment_status": txn["payment_status"], "listing_id": txn["listing_id"], "amount": txn["amount"]}


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    secret = (os.environ.get("RAZORPAY_WEBHOOK_SECRET") or "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="RAZORPAY_WEBHOOK_SECRET not configured")
    body = await request.body()
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("X-Razorpay-Signature", "")):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    event = json.loads(body)
    if event.get("event") in ("payment.captured", "order.paid"):
        payment = event.get("payload", {}).get("payment", {}).get("entity", {})
        if payment.get("order_id"):
            await db.payment_transactions.update_one({"session_id": payment["order_id"]}, {"$set": {"razorpay_payment_id": payment.get("id")}})
            await finalize_payment(payment["order_id"])
    return {"status": "ok"}
