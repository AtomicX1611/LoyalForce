"""
routers/predict.py — Live What-If inference endpoint.

POST /api/predict/what-if   [JWT required]

    Accepts a member_id and user-adjusted feature deltas.
    Looks up the customer's stored feature values from MongoDB,
    applies the deltas, then runs predict_proba() on the full
    11-feature vector to return a recalculated churn risk score.

    The model is loaded once at startup (app.state.ml_model) and is
    never re-run for batch scoring — the DB already holds pre-computed
    scores from the offline seed_db.py pipeline.

    Architecture note:
        Scikit-learn predictions are synchronous and CPU-bound.
        The model.predict_proba() call is executed inside a background
        thread via run_in_threadpool() to prevent blocking FastAPI's
        async event loop.
"""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.db.client import get_db
from app.dependencies import CurrentTenant

router = APIRouter(prefix="/predict", tags=["ML Inference"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class WhatIfRequest(BaseModel):
    member_id: str = Field(
        description="The member whose features to use as a baseline"
    )
    flight_freq_delta: float = Field(
        default=0.0,
        description="Change in avg_flights_per_month (positive = more, negative = less)"
    )
    points_redeemed_ratio: float = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Override for points_redemption_ratio (0.0–1.0). "
                    "If omitted, the customer's stored value is used.",
    )
    months_inactive_override: int = Field(
        default=None,
        ge=0,
        description="Override for recency_months. "
                    "If omitted, the customer's stored value is used.",
    )


class WhatIfResponse(BaseModel):
    member_id: str
    original_churn_risk: float = Field(
        description="Current stored churn risk score (0–100)"
    )
    recalculated_churn_risk: float = Field(
        description="Recalculated churn probability after applying deltas (0–100)"
    )
    delta: float = Field(
        description="Difference: recalculated − original (negative = improvement)"
    )


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/what-if",
    response_model=WhatIfResponse,
    summary="Recalculate churn risk for a hypothetical feature scenario",
)
async def predict_what_if(
    request: Request,
    body: WhatIfRequest,
    tenant_id: CurrentTenant,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> WhatIfResponse:
    """
    1. Verify the ML model is loaded (503 if not).
    2. Fetch the customer's stored feature values from MongoDB.
    3. Apply user-supplied deltas / overrides on top.
    4. Run predict_proba() in a thread pool (non-blocking).
    5. Return original vs recalculated churn risk.
    """
    model = getattr(request.app.state, "ml_model", None)
    feature_names: list[str] = getattr(request.app.state, "ml_feature_names", [])

    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The ML inference engine is not loaded. "
                "Ensure MODEL_PATH is set and loyalty_model.joblib exists. "
                "Run: py scripts/train_and_export.py"
            ),
        )

    # -------------------------------------------------------------------------
    # Fetch customer's stored features from MongoDB
    # -------------------------------------------------------------------------
    customer = await db.customers.find_one(
        {"tenant_id": tenant_id, "member_id": body.member_id},
        {"_id": 0, "analytics.features": 1, "analytics.churn_risk_score": 1},
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer '{body.member_id}' not found in your tenant.",
        )

    stored_features: dict = customer.get("analytics", {}).get("features", {})
    original_risk: float = customer.get("analytics", {}).get("churn_risk_score", 0.0)

    # -------------------------------------------------------------------------
    # Build the feature vector using stored values, then apply deltas
    #
    # Feature order must match training exactly (stored in artifact):
    #   salary_imputed, clv, total_flights, total_distance,
    #   total_points_accumulated, total_points_redeemed, active_months,
    #   avg_flights_per_month, points_redemption_ratio,
    #   distance_per_flight, tenure_months
    #
    # The seed_db.py stores a subset under analytics.features. We use
    # those values and fall back to 0 for fields not stored.
    # -------------------------------------------------------------------------

    # Reconstruct the fields we need from stored_features
    avg_flights = float(stored_features.get("avg_flights_per_month", 0.0))
    redemption  = float(stored_features.get("points_redemption_ratio", 0.0))
    recency     = float(stored_features.get("recency_months", 0.0))
    total_flights = float(stored_features.get("total_flights", 0.0))
    total_points_redeemed = float(stored_features.get("points_redeemed", 0.0))

    # Apply user-supplied deltas / overrides
    avg_flights_new = max(0.0, avg_flights + body.flight_freq_delta)
    redemption_new  = (
        body.points_redeemed_ratio
        if body.points_redeemed_ratio is not None
        else redemption
    )
    recency_new = (
        float(body.months_inactive_override)
        if body.months_inactive_override is not None
        else recency
    )

    # The remaining 8 features are not user-adjustable — use stored values
    feature_vector_map = {
        "salary_imputed":            float(stored_features.get("salary_imputed", 0.0)),
        "clv":                       float(stored_features.get("clv", 0.0)),
        "total_flights":             total_flights,
        "total_distance":            float(stored_features.get("total_distance", 0.0)),
        "total_points_accumulated":  float(stored_features.get("total_points_accumulated", 0.0)),
        "total_points_redeemed":     total_points_redeemed,
        "active_months":             float(stored_features.get("active_months", 0.0)),
        "avg_flights_per_month":     avg_flights_new,
        "points_redemption_ratio":   redemption_new,
        "distance_per_flight":       float(stored_features.get("distance_per_flight", 0.0)),
        "tenure_months":             float(stored_features.get("tenure_months", 0.0)),
    }

    # Build ordered numpy array matching training feature order
    ordered_features = [feature_vector_map.get(f, 0.0) for f in feature_names]

    # -------------------------------------------------------------------------
    # Run inference in a thread pool (predict_proba is synchronous + CPU-bound)
    # -------------------------------------------------------------------------
    def _run_inference() -> float:
        feature_array = np.array([ordered_features])
        proba = model.predict_proba(feature_array)[0][1]  # class 1 = churn
        return round(float(proba) * 100, 2)

    recalculated = await run_in_threadpool(_run_inference)
    delta = round(recalculated - original_risk, 2)

    return WhatIfResponse(
        member_id=body.member_id,
        original_churn_risk=original_risk,
        recalculated_churn_risk=recalculated,
        delta=delta,
    )
