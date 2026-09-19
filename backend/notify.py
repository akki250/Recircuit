import os
import asyncio
import logging
from bson import ObjectId
from db import db, now_iso

logger = logging.getLogger("recircuit.notify")


def twilio_config():
    sid = (os.environ.get("TWILIO_ACCOUNT_SID") or "").strip()
    token = (os.environ.get("TWILIO_AUTH_TOKEN") or "").strip()
    sms_from = (os.environ.get("TWILIO_FROM_NUMBER") or "").strip()
    wa_from = (os.environ.get("TWILIO_WHATSAPP_FROM") or "").strip()
    return {"sid": sid, "token": token, "sms_from": sms_from, "wa_from": wa_from, "enabled": bool(sid and token and sms_from), "whatsapp_enabled": bool(sid and token and wa_from)}


def _send_twilio(cfg: dict, channel: str, to: str, body: str) -> str:
    from twilio.rest import Client
    client = Client(cfg["sid"], cfg["token"])
    if channel == "whatsapp":
        msg = client.messages.create(body=body, from_=cfg["wa_from"], to=f"whatsapp:{to}")
    else:
        msg = client.messages.create(body=body, from_=cfg["sms_from"], to=to)
    return msg.sid


async def notify(user_id: str, title: str, body: str, listing_id: str | None = None, kind: str = "info"):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    cfg = twilio_config()
    phone = (user.get("phone") or "").strip()
    channel = user.get("alert_channel") or "sms"
    if channel == "whatsapp" and not cfg["whatsapp_enabled"]:
        channel = "sms"
    delivery = {"channel": channel, "status": "in_app_only", "reason": None, "sid": None}
    if not phone:
        delivery["reason"] = "no_phone"
    elif not cfg["enabled"]:
        delivery["reason"] = "twilio_not_configured"
    else:
        try:
            delivery["sid"] = await asyncio.to_thread(_send_twilio, cfg, channel, phone, f"ReCircuit · {title}\n{body}")
            delivery["status"] = "sent"
        except Exception as e:
            logger.error(f"Twilio send failed: {e}")
            delivery.update({"status": "failed", "reason": str(e)[:200]})
    await db.notifications.insert_one({
        "user_id": user_id, "title": title, "body": body, "listing_id": listing_id, "kind": kind,
        "read": False, "delivery": delivery, "created_at": now_iso(),
    })
