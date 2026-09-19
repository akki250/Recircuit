from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from db import db, client
from auth import router as auth_router
from routes import router as api_router
from razorpay_routes import router as razorpay_router
from seed import seed_all
from storage import init_storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("recircuit")

app = FastAPI(title="ReCircuit API", description="Digitalizing the Informal E-Waste Recycling System")
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(razorpay_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.listings.create_index([("status", 1), ("created_at", -1)])
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.activity_logs.create_index([("created_at", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await seed_all()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
