"""
routers/predict.py — On-demand ML inference endpoint.

POST /api/predict/what-if   [JWT required]

    Accepts user-adjusted feature deltas and returns a recalculated churn
    risk score using the in-memory scikit-learn model.

    PHASE 3 PLACEHOLDER: This router is registered now so the FastAPI router
    tree is complete, but the actual inference logic is wired in Phase 3 when
    the model artifact (loyalty_model.joblib) is loaded via the lifespan event.

    When Phase 3 is implemented:
    - The loaded model is retrieved from app.state.ml_model
    - The predict_proba() call is wrapped in run_in_threadpool() to prevent
      blocking FastAPI's async event loop with synchronous CPU work
    - The feature vector is assembled from the incoming request fields

    Architecture note (from spec):
        "Scikit-learn predictions are synchronous and CPU-bound. To prevent
        blocking FastAPI's asynchronous event loop, the live inference route
        MUST execute the model.predict_proba() call inside a background thread
        using fastapi.concurrency.run_in_threadpool or asyncio.to_thread()."
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.dependencies import CurrentTenant

router = APIRouter(prefix="/predict", tags=["ML Inference"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class WhatIfRequest(BaseModel):
    flight_freq_delta: float = Field(
        description="Change in average flights per month (positive = more, negative = less)"
    )
    points_redeemed_ratio: float = Field(
        ge=0.0, le=1.0,
        description="Ratio of points redeemed vs accumulated (0.0–1.0)"
    )
    months_inactive: int = Field(
        ge=0,
        description="Number of months since last flight activity"
    )


class WhatIfResponse(BaseModel):
    recalculated_churn_risk: float = Field(
        description="Predicted churn probability as a percentage (0.0–100.0)"
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
    tenant_id: CurrentTenant,  # noqa: ARG001 — validates JWT, tenant context enforced
) -> WhatIfResponse:
    """
    PHASE 3 STUB: Returns a 503 until the model artifact is loaded.

    After Phase 3 implementation, this route will:
    1. Build a numpy feature vector from the request body
    2. Call run_in_threadpool(model.predict_proba, feature_vector)
    3. Return the churn class probability as a percentage
    """
    model = getattr(request.app.state, "ml_model", None)

    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The ML inference engine is not yet loaded. "
                "This feature will be available after Phase 3 deployment. "
                "Ensure MODEL_PATH is set and the .joblib artifact exists."
            ),
        )

    # --- Phase 3 implementation block (active once model is loaded) ---------
    import numpy as np

    def _run_inference() -> float:
        """
        Synchronous inference call — runs in a thread pool to avoid blocking
        the async event loop (per architecture spec mandate).
        """
        features = np.array([[
            body.flight_freq_delta,
            body.points_redeemed_ratio,
            body.months_inactive,
        ]])
        # predict_proba returns [[prob_class_0, prob_class_1]]
        # Class 1 = churn; multiply by 100 for a percentage score
        proba = model.predict_proba(features)[0][1]
        return round(float(proba) * 100, 2)

    churn_risk = await run_in_threadpool(_run_inference)

    return WhatIfResponse(recalculated_churn_risk=churn_risk)
