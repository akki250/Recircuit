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


# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("recircuit")


# ---------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------

app = FastAPI(
    title="ReCircuit API",
    description="Digitalizing the Informal E-Waste Recycling System",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

# Render environment variable:
# CORS_ORIGINS=https://recircuit-d7tyeoz2g-hobbist2.vercel.app
#
# Multiple origins can be separated with commas.
#
# Example:
# CORS_ORIGINS=https://example.com,https://www.example.com

cors_origins = os.environ.get(
    "CORS_ORIGINS",
    "https://recircuit-d7tyeoz2g-hobbist2.vercel.app",
).split(",")

# Remove accidental spaces from multiple origins
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

logger.info("CORS allowed origins: %s", cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# API Routers
# ---------------------------------------------------------

app.include_router(auth_router)
app.include_router(api_router)
app.include_router(razorpay_router)


# ---------------------------------------------------------
# Startup
# ---------------------------------------------------------

@app.on_event("startup")
async def startup():
    logger.info("Starting ReCircuit API...")

    # Database indexes
    await db.users.create_index(
        "email",
        unique=True,
    )

    await db.login_attempts.create_index(
        "identifier",
    )

    await db.listings.create_index(
        [
            ("status", 1),
            ("created_at", -1),
        ]
    )

    await db.payment_transactions.create_index(
        "session_id",
        unique=True,
    )

    await db.activity_logs.create_index(
        [
            ("created_at", -1),
        ]
    )

    await db.notifications.create_index(
        [
            ("user_id", 1),
            ("created_at", -1),
        ]
    )

    # Seed initial data / admin user
    await seed_all()

    # Object storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(
            "Storage init failed: %s",
            e,
        )

    logger.info("ReCircuit API startup complete.")


# ---------------------------------------------------------
# Shutdown
# ---------------------------------------------------------

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Closing database connection...")
    client.close()
    logger.info("Database connection closed.")
