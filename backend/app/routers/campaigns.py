"""
routers/campaigns.py — Campaign audit log endpoints.

GET /api/campaigns   [JWT required]
    Returns paginated campaign audit records from the campaigns collection,
    scoped strictly to the authenticated tenant.

    Query Parameters:
        page  (int, default=1)  — page number, 1-indexed
        limit (int, default=20) — records per page (max 100)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.client import get_db
from app.dependencies import CurrentTenant

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


class _CampaignsResponse:
    pass


@router.get(
    "",
    response_model=Dict[str, Any],
    summary="Paginated campaign audit log — scoped to the authenticated tenant",
)
async def list_campaigns(
    tenant_id: CurrentTenant,
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(default=20, ge=1, le=100, description="Records per page (max 100)"),
) -> Dict[str, Any]:
    """
    Return a paginated list of campaign audit records for the requesting tenant,
    ordered by most recent first.
    """
    import asyncio

    skip = (page - 1) * limit
    mongo_filter: Dict[str, Any] = {"tenant_id": tenant_id}

    cursor = (
        db.campaigns
        .find(mongo_filter, {"_id": 0})
        .sort("executed_at", -1)
        .skip(skip)
        .limit(limit)
    )

    total_coro = db.campaigns.count_documents(mongo_filter)
    total, docs = await asyncio.gather(
        total_coro,
        cursor.to_list(length=limit),
    )

    # Serialize datetime fields to ISO strings for JSON
    serialized: List[Dict[str, Any]] = []
    for doc in docs:
        d = dict(doc)
        if "executed_at" in d and hasattr(d["executed_at"], "isoformat"):
            d["executed_at"] = d["executed_at"].isoformat()
        serialized.append(d)

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "data": serialized,
    }
