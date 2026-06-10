"""
db/client.py — Async MongoDB client lifecycle and index management.

The Motor client is initialised once during the FastAPI lifespan event and
stored in `app.state.db`. All routers obtain the database handle via the
`get_db` helper which reads from that same state object — no global
singletons, fully testable via dependency overrides.

Index strategy (per architecture spec):
  - customers collection: compound index on (tenant_id, analytics.assigned_persona)
    — powers both the customer grid and segment-filtered queries with no
    full-collection scans.
  - campaigns collection: compound index on (tenant_id, executed_at DESC)
    — optimises the audit log retrieval ordered by recency.
  - Unique index on customers (tenant_id, member_id)
    — prevents duplicate seeding and enforces data integrity.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Client lifecycle — called by the FastAPI lifespan context manager
# ---------------------------------------------------------------------------

async def connect_to_mongo(app) -> None:
    """
    Open a Motor connection and store it on app.state.

    Motor manages its own connection pool internally; we do NOT open a new
    connection per request. This function is invoked exactly once at startup.
    """
    settings = get_settings()
    logger.info("Connecting to MongoDB...")

    client: AsyncIOMotorClient = AsyncIOMotorClient(
        settings.MONGO_URI,
        # Enforce a strict server selection timeout so a misconfigured URI
        # surfaces immediately at startup rather than silently hanging.
        serverSelectionTimeoutMS=10_000,
    )

    # Force a real connection attempt to validate the URI immediately.
    await client.admin.command("ping")
    logger.info("MongoDB connection established successfully.")

    db: AsyncIOMotorDatabase = client.get_default_database()

    # Persist both handles on app.state for access in route handlers.
    app.state.mongo_client = client
    app.state.db = db

    # Bootstrap all indexes — idempotent (Motor skips if they already exist).
    await bootstrap_indexes(db)


async def close_mongo_connection(app) -> None:
    """
    Gracefully close the Motor connection on application shutdown.
    """
    if hasattr(app.state, "mongo_client") and app.state.mongo_client:
        app.state.mongo_client.close()
        logger.info("MongoDB connection closed.")


# ---------------------------------------------------------------------------
# Index bootstrap
# ---------------------------------------------------------------------------

async def bootstrap_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Create all required indexes. Motor's create_indexes is idempotent —
    calling this on a database that already has the indexes is a no-op.
    """

    # ---- customers collection ------------------------------------------------
    customers_indexes = [
        # Primary query index: tenant scoping + segment filtering
        IndexModel(
            [("tenant_id", ASCENDING), ("analytics.assigned_persona", ASCENDING)],
            name="idx_tenant_persona",
        ),
        # Churn risk sort support — used by the dashboard aggregation
        IndexModel(
            [("tenant_id", ASCENDING), ("analytics.churn_risk_score", DESCENDING)],
            name="idx_tenant_churn_risk",
        ),
        # Uniqueness constraint — prevents duplicate member records per tenant
        IndexModel(
            [("tenant_id", ASCENDING), ("member_id", ASCENDING)],
            name="idx_tenant_member_unique",
            unique=True,
        ),
    ]
    await db.customers.create_indexes(customers_indexes)
    logger.info("Indexes ensured on 'customers' collection.")

    # ---- campaigns collection ------------------------------------------------
    campaigns_indexes = [
        IndexModel(
            [("tenant_id", ASCENDING), ("executed_at", DESCENDING)],
            name="idx_tenant_executed_at",
        ),
        IndexModel(
            [("tenant_id", ASCENDING), ("target_member_id", ASCENDING)],
            name="idx_tenant_target_member",
        ),
    ]
    await db.campaigns.create_indexes(campaigns_indexes)
    logger.info("Indexes ensured on 'campaigns' collection.")

    # ---- tenants collection --------------------------------------------------
    await db.tenants.create_index(
        [("tenant_id", ASCENDING)],
        name="idx_tenant_id_unique",
        unique=True,
    )
    logger.info("Index ensured on 'tenants' collection.")


# ---------------------------------------------------------------------------
# Request-scoped database helper
# ---------------------------------------------------------------------------

def get_db(request: Request) -> AsyncIOMotorDatabase:
    """
    FastAPI dependency: return the shared Motor database from app.state.

    Usage in a router:
        from fastapi import Depends
        from app.db.client import get_db
        from motor.motor_asyncio import AsyncIOMotorDatabase

        @router.get("/example")
        async def example(db: AsyncIOMotorDatabase = Depends(get_db)):
            ...
    """
    return request.app.state.db
