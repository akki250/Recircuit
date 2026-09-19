import os
import secrets
from datetime import datetime, timezone, timedelta
from db import db
from auth import hash_password, verify_password
from models import Listing
from pricing import estimate

COORDS = {
    "Ambattur, Chennai": (13.1143, 80.1548), "Seelampur, Delhi": (28.6692, 77.2680), "Moradabad, UP": (28.8386, 78.7733),
    "Dharavi, Mumbai": (19.0400, 72.8500), "Bhiwandi, Mumbai": (19.2967, 73.0631), "Bengaluru": (12.9716, 77.5946),
    "Hyderabad": (17.3850, 78.4867), "Kolkata": (22.5726, 88.3639), "Pune": (18.5204, 73.8567), "Jaipur": (26.9124, 75.7873),
}
RECYCLER_HQ = (19.0760, 72.8777)

DEMO_LOTS = [
    ("Dell Latitude laptops (office clear-out)", "laptop", 9.5, "repairable", "completed", 13, "Ambattur, Chennai"),
    ("Mixed smartphones, cracked screens", "smartphone", 3.2, "scrap", "completed", 11, "Seelampur, Delhi"),
    ("Server motherboards & RAM sticks", "pcb", 4.0, "working", "completed", 9, "Moradabad, UP"),
    ("Copper cables and chargers bundle", "cables", 12.0, "scrap", "paid", 6, "Dharavi, Mumbai"),
    ("Old CRT monitors (x4)", "monitor_tv", 38.0, "scrap", "paid", 4, "Bhiwandi, Mumbai"),
    ("Inverter batteries, lead-acid", "batteries", 22.5, "scrap", "completed", 3, "Bengaluru"),
    ("HP LaserJet printers (x3)", "printer", 27.0, "repairable", "matched", 2, "Hyderabad"),
    ("Desktop tower PCs from cyber cafe", "desktop", 41.0, "repairable", "open", 1, "Kolkata"),
    ("Kitchen small appliances lot", "small_appliance", 15.0, "scrap", "open", 0, "Pune"),
    ("Working Samsung tablets (x6)", "smartphone", 2.6, "working", "open", 0, "Jaipur"),
]


async def upsert_user(email: str, password: str, name: str, role: str) -> dict:
    existing = await db.users.find_one({"email": email})
    if existing is None:
        doc = {"email": email, "name": name, "role": role, "password_hash": hash_password(password), "wallet_balance": 0.0, "created_at": datetime.now(timezone.utc).isoformat()}
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        return doc
    if not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {"password_hash": hash_password(password)}})
    return existing


async def seed_all():
    await upsert_user(os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"], "Admin", "admin")
    collector = await upsert_user("collector@nullset.dev", "Collector@123", "Ravi Kumar", "collector")
    recycler = await upsert_user("recycler@nullset.dev", "Recycler@123", "GreenLoop Recyclers", "recycler")
    if recycler.get("lat") is None:
        await db.users.update_one({"_id": recycler["_id"]}, {"$set": {"lat": RECYCLER_HQ[0], "lng": RECYCLER_HQ[1]}})
    await db.users.update_one({"_id": collector["_id"], "phone": {"$in": [None, ""]}}, {"$set": {"phone": "+919999900001", "alert_channel": "sms"}})
    await db.users.update_one({"_id": recycler["_id"], "phone": {"$in": [None, ""]}}, {"$set": {"phone": "+919999900002", "alert_channel": "sms"}})
    for loc, (lat, lng) in COORDS.items():
        await db.listings.update_many({"seeded": True, "location": loc, "lat": {"$in": [None]}}, {"$set": {"lat": lat, "lng": lng}})
    if await db.listings.count_documents({"seeded": True}) > 0:
        return
    cid, rid = str(collector["_id"]), str(recycler["_id"])
    earned = 0.0
    for title, cat, kg, cond, status, days_ago, loc in DEMO_LOTS:
        est = estimate(cat, kg, cond)
        created = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=3)
        listing = Listing(
            collector_id=cid, collector_name=collector["name"], title=title, description=f"Demo lot · {est['label']}", location=loc,
            lat=COORDS[loc][0], lng=COORDS[loc][1], category=est["category"], category_label=est["label"], weight_kg=kg, condition=cond, price_per_kg=est["price_per_kg"],
            multiplier=est["multiplier"], estimated_price=est["estimated_price"], status=status, created_at=created.isoformat(),
        )
        doc = listing.to_mongo()
        doc["seeded"] = True
        if status in ("matched", "paid", "completed"):
            doc.update({"recycler_id": rid, "recycler_name": recycler["name"], "matched_at": (created + timedelta(hours=5)).isoformat()})
        if status in ("paid", "completed"):
            paid_at = (created + timedelta(hours=9)).isoformat()
            doc["paid_at"] = paid_at
            earned += est["estimated_price"]
        if status == "completed":
            doc.update({"handover_code": f"EW-{secrets.token_hex(3).upper()}", "handover_at": (created + timedelta(hours=20)).isoformat()})
        res = await db.listings.insert_one(doc)
        lid = str(res.inserted_id)
        actor_c = {"id": cid, "name": collector["name"], "role": "collector"}
        actor_r = {"id": rid, "name": recycler["name"], "role": "recycler"}
        logs = [{"actor": actor_c, "action": "listing.created", "detail": f"Listed '{title}' · {kg} kg {est['label']} for ₹{est['estimated_price']}", "at": created}]
        if status != "open":
            logs.append({"actor": actor_r, "action": "listing.matched", "detail": f"{recycler['name']} matched with '{title}'", "at": created + timedelta(hours=5)})
        if status in ("paid", "completed"):
            logs.append({"actor": actor_r, "action": "payment.completed", "detail": f"₹{est['estimated_price']} paid for '{title}' · collector wallet credited", "at": created + timedelta(hours=9)})
            await db.ledger.insert_one({"user_id": cid, "type": "credit", "amount": est["estimated_price"], "listing_id": lid, "title": title, "counterparty": recycler["name"], "session_id": "seed", "created_at": doc["paid_at"]})
        if status == "completed":
            logs.append({"actor": actor_c, "action": "handover.recorded", "detail": f"Digital handover {doc['handover_code']} for '{title}'", "at": created + timedelta(hours=20)})
        for lg in logs:
            await db.activity_logs.insert_one({
                "actor_id": lg["actor"]["id"], "actor_name": lg["actor"]["name"], "actor_role": lg["actor"]["role"], "action": lg["action"],
                "detail": lg["detail"], "listing_id": lid, "amount": est["estimated_price"], "created_at": lg["at"].isoformat(),
            })
    await db.users.update_one({"_id": collector["_id"]}, {"$set": {"wallet_balance": round(earned, 2)}})
