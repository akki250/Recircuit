import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def log_activity(actor: dict, action: str, detail: str, listing_id: str | None = None, amount: float | None = None):
    await db.activity_logs.insert_one({
        "actor_id": actor.get("id"),
        "actor_name": actor.get("name"),
        "actor_role": actor.get("role"),
        "action": action,
        "detail": detail,
        "listing_id": listing_id,
        "amount": amount,
        "created_at": now_iso(),
    })
