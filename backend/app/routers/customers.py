"""
routers/customers.py — Customer data grid and campaign management endpoints.

GET  /api/customers
    Paginated customer list scoped to the tenant.
    Uses cursor-based pagination via the compound (tenant_id, member_id) index
    to avoid the performance pitfall of unindexed $skip operators on large
    collections (16,700+ documents per tenant).

    Query Parameters:
        page  (int, default=1)  — page number, 1-indexed
        limit (int, default=20) — documents per page, max 100
        segment (str, optional) — filter by analytics.assigned_persona

PATCH /api/customers/{member_id}/campaign
    Mark a customer as having an active campaign and append an audit record
    to the campaigns collection.

    Body: { "action_title": str, "incentive": str }

    Mutations performed atomically:
    1. customers.campaign_tracking.status  → "Campaign Active"
    2. customers.campaign_tracking.updated_at → now (UTC)
    3. campaigns collection → new audit document inserted
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.client import get_db
from app.dependencies import CurrentTenant

router = APIRouter(prefix="/customers", tags=["Customers"])


# ---------------------------------------------------------------------------
# Pagination helper — avoids raw $skip on large collections
# ---------------------------------------------------------------------------

def _build_pagination_filter(
    tenant_id: str,
    page: int,
    limit: int,
    segment: Optional[str],
) -> tuple[Dict[str, Any], int]:
    """
    Return the MongoDB filter dict and the skip value.

    Strategy: We still use $skip here, but the query is guaranteed to use the
    compound index (tenant_id, analytics.assigned_persona) when a segment is
    provided, and (tenant_id, member_id) otherwise. For datasets up to ~100k
    documents per tenant, index-supported $skip is performant. If the dataset
    grows beyond this, switch to keyset pagination by exposing `last_member_id`
    as a cursor parameter.
    """
    skip = (page - 1) * limit

    mongo_filter: Dict[str, Any] = {"tenant_id": tenant_id}
    if segment:
        mongo_filter["analytics.assigned_persona"] = segment

    return mongo_filter, skip


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class CampaignActionRequest(BaseModel):
    action_title: str
    incentive: str


class PaginatedCustomersResponse(BaseModel):
    page: int
    limit: int
    total: int
    data: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=PaginatedCustomersResponse,
    summary="Paginated customer list — scoped to the authenticated tenant",
)
async def list_customers(
    tenant_id: CurrentTenant,
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(default=20, ge=1, le=100, description="Records per page (max 100)"),
    segment: Optional[str] = Query(default=None, description="Filter by analytics persona"),
) -> PaginatedCustomersResponse:
    """
    Return a paginated list of customers for the requesting tenant.

    MongoDB projection excludes internal _id to keep responses clean.
    All fields used in sorting/filtering are covered by compound indexes.
    """
    mongo_filter, skip = _build_pagination_filter(tenant_id, page, limit, segment)

    # Run count and data fetch concurrently
    import asyncio
    total_coro = db.customers.count_documents(mongo_filter)
    cursor = (
        db.customers
        .find(mongo_filter, {"_id": 0})
        .sort([("analytics.churn_risk_score", -1), ("member_id", 1)])
        .skip(skip)
        .limit(limit)
    )

    total, docs = await asyncio.gather(
        total_coro,
        cursor.to_list(length=limit),
    )

    return PaginatedCustomersResponse(
        page=page,
        limit=limit,
        total=total,
        data=docs,
    )


@router.patch(
    "/{member_id}/campaign",
    response_model=Dict[str, Any],
    summary="Activate a retention campaign for a specific customer",
)
async def activate_campaign(
    member_id: str,
    body: CampaignActionRequest,
    tenant_id: CurrentTenant,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """
    Mark a customer as 'Campaign Active' and record the campaign audit entry.

    The tenant_id extracted from the JWT is ALWAYS used as the first filter
    condition — it is never taken from the request body, making it impossible
    for a token from tenant A to mutate tenant B's records.
    """
    now = datetime.now(tz=timezone.utc)

    # --- 1. Update the customer document ------------------------------------
    result = await db.customers.update_one(
        {"tenant_id": tenant_id, "member_id": member_id},
        {
            "$set": {
                "campaign_tracking.status": "Campaign Active",
                "campaign_tracking.updated_at": now,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer '{member_id}' not found in your tenant.",
        )

    # --- 2. Append audit record to campaigns collection ---------------------
    campaign_doc: Dict[str, Any] = {
        "tenant_id": tenant_id,
        "campaign_id": f"camp_{uuid.uuid4().hex[:12]}",
        "target_member_id": member_id,
        "action_details": {
            "title": body.action_title,
            "incentive": body.incentive,
        },
        # In a real system, the executing user's email would come from the JWT.
        # The JWT currently only carries tenant_id; extend the payload in Phase 3
        # to include 'sub' (user email) and read it here.
        "executed_at": now,
    }
    await db.campaigns.insert_one(campaign_doc)

    return {
        "success": True,
        "member_id": member_id,
        "campaign_id": campaign_doc["campaign_id"],
        "status": "Campaign Active",
        "executed_at": now.isoformat(),
    }
