"""
routers/dashboard.py — Aggregated metrics endpoint.

GET /api/dashboard/metrics   [JWT + Tenant required]

Returns a single aggregation document scoped strictly to the requesting tenant.
The pipeline runs entirely inside MongoDB, minimising data transfer.

Metrics returned:
  - total_customers      : int
  - high_risk_count      : customers with churn_risk_score >= 70
  - avg_churn_risk       : float (0–100), mean across all customers
  - campaign_active_count: customers with campaign_tracking.status == "Campaign Active"
  - segment_breakdown    : { segment_name: count } dict
  - top_at_risk          : 5 highest-risk customers (id, name, score, persona)
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.client import get_db
from app.dependencies import CurrentTenant

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/metrics",
    response_model=Dict[str, Any],
    summary="Aggregated churn & CLV metrics for the authenticated tenant",
)
async def get_dashboard_metrics(
    tenant_id: CurrentTenant,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """
    Execute a single aggregation pipeline against the customers collection.
    All stages filter on tenant_id first so the compound index is hit.
    """
    tenant_filter = {"$match": {"tenant_id": tenant_id}}

    pipeline: List[Dict[str, Any]] = [
        # Stage 1: Restrict to the authenticated tenant immediately
        tenant_filter,
        # Stage 2: Compute all scalar metrics in a single $group pass
        {
            "$group": {
                "_id": None,
                "total_customers": {"$sum": 1},
                "high_risk_count": {
                    "$sum": {
                        "$cond": [
                            {"$gte": ["$analytics.churn_risk_score", 70]},
                            1,
                            0,
                        ]
                    }
                },
                "avg_churn_risk": {"$avg": "$analytics.churn_risk_score"},
                "campaign_active_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$campaign_tracking.status", "Campaign Active"]},
                            1,
                            0,
                        ]
                    }
                },
                "avg_clv": {"$avg": "$clv"},
                "total_points_balance": {"$sum": "$points_balance"},
            }
        },
        # Stage 3: Clean up the _id=null artifact
        {"$project": {"_id": 0}},
    ]

    # --- Scalar metrics aggregate -------------------------------------------
    cursor = db.customers.aggregate(pipeline)
    results = await cursor.to_list(length=1)
    metrics: Dict[str, Any] = results[0] if results else {
        "total_customers": 0,
        "high_risk_count": 0,
        "avg_churn_risk": 0.0,
        "campaign_active_count": 0,
        "avg_clv": 0.0,
        "total_points_balance": 0,
    }

    # Round floats for clean API responses
    metrics["avg_churn_risk"] = round(metrics.get("avg_churn_risk") or 0.0, 2)
    metrics["avg_clv"] = round(metrics.get("avg_clv") or 0.0, 2)

    # --- Segment breakdown ---------------------------------------------------
    segment_pipeline: List[Dict[str, Any]] = [
        {"$match": {"tenant_id": tenant_id}},
        {
            "$group": {
                "_id": "$analytics.assigned_persona",
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
    ]
    seg_cursor = db.customers.aggregate(segment_pipeline)
    segment_docs = await seg_cursor.to_list(length=100)
    metrics["segment_breakdown"] = {
        doc["_id"]: doc["count"]
        for doc in segment_docs
        if doc["_id"]  # exclude null persona entries
    }

    # --- Top 5 at-risk customers ---------------------------------------------
    top_at_risk_cursor = db.customers.find(
        {"tenant_id": tenant_id},
        {
            "_id": 0,
            "member_id": 1,
            "tier": 1,
            "analytics.churn_risk_score": 1,
            "analytics.assigned_persona": 1,
            "clv": 1,
        },
    ).sort("analytics.churn_risk_score", -1).limit(5)

    top_docs = await top_at_risk_cursor.to_list(length=5)
    metrics["top_at_risk"] = [
        {
            "member_id": d["member_id"],
            "tier": d.get("tier"),
            "churn_risk_score": d.get("analytics", {}).get("churn_risk_score"),
            "assigned_persona": d.get("analytics", {}).get("assigned_persona"),
            "clv": d.get("clv"),
        }
        for d in top_docs
    ]

    return metrics
