"""
scripts/seed_db.py — Batch CSV-to-MongoDB seeder.

USAGE (run from the backend/ directory):
    py scripts/seed_db.py

PURPOSE:
    This is a ONE-TIME (idempotent) utility script that reads the pre-computed
    ML output CSVs and populates the MongoDB database with the batch-processed
    customer and tenant data.

    It is NOT part of the FastAPI server. Run it manually before starting the
    API server for the first time, or after regenerating ML outputs.

INPUT FILES (relative to the LoyalForce project root):
    ml/outputs/customer_segments.csv  — 16,700 rows, persona + behavioural features
    ml/outputs/churn_predictions.csv  — 16,700 rows, predicted churn labels

CSV COLUMN REFERENCE (confirmed by inspection):
    customer_segments.csv:
        loyalty_number, loyalty_card, clv, total_points_accumulated,
        total_points_redeemed, total_flights, active_months,
        avg_flights_per_month, points_redemption_ratio, recency_months,
        customer_segment, churn, tenure_months, salary_imputed, ...

    churn_predictions.csv:
        predicted_churn, actual_churn (no loyalty_number — positionally aligned)

JOIN STRATEGY:
    Both CSVs are produced from the same underlying dataset in the same row
    order. They are joined by positional index (iloc-aligned), NOT on a key.
    A loyalty_number column is added from the segments file.

IDEMPOTENCY:
    Uses update_one with upsert=True keyed on (tenant_id, member_id).
    Safe to re-run after regenerating CSVs — existing records are overwritten.

BATCH SIZE:
    Documents are inserted / upserted in batches of 500 to stay within
    MongoDB's 16 MB document limit per bulk write operation.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
# Resolve project root from this script's location: backend/scripts/ → backend/ → project root
SCRIPT_DIR = Path(__file__).resolve().parent          # backend/scripts/
BACKEND_DIR = SCRIPT_DIR.parent                       # backend/
PROJECT_ROOT = BACKEND_DIR.parent                     # LoyalForce/

# Load .env from the backend directory
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    stream=sys.stdout,
)
logger = logging.getLogger("seed_db")

# ---------------------------------------------------------------------------
# Configuration — read from environment (never hardcoded)
# ---------------------------------------------------------------------------
MONGO_URI: str = os.environ.get("MONGO_URI", "")
TENANT_ID: str = os.environ.get("SEED_TENANT_ID", "northern_lights_air")
COMPANY_NAME: str = os.environ.get("SEED_COMPANY_NAME", "Northern Lights Air")
MODEL_VERSION: str = "v1.0.0"
BATCH_SIZE: int = 500

# Input CSV paths
SEGMENTS_CSV: Path = PROJECT_ROOT / "ml" / "outputs" / "customer_segments.csv"
CHURN_CSV: Path = PROJECT_ROOT / "ml" / "outputs" / "churn_predictions.csv"


# ---------------------------------------------------------------------------
# Persona mapping — maps customer_segment values to human-readable personas
# ---------------------------------------------------------------------------
PERSONA_MAP: Dict[str, str] = {
    "At-Risk Customers":    "Slipping Business Traveler",
    "Loyal Customers":      "Loyal Frequent Flyer",
    "Churned Customers":    "Lapsed Member",
    "New Customers":        "Emerging Traveler",
    "Occasional Customers": "Casual Holidaymaker",
}


# ---------------------------------------------------------------------------
# XAI factor generator — produces explainable risk factors per customer
# ---------------------------------------------------------------------------

def _generate_xai_factors(row: pd.Series) -> List[str]:
    """
    Build a short list of human-readable churn risk factors for a customer.
    Mirrors the logic described in the architecture spec's example XAI output.
    """
    factors: List[str] = []

    recency = float(row.get("recency_months", 0))
    avg_flights = float(row.get("avg_flights_per_month", 0))
    redemption = float(row.get("points_redemption_ratio", 0))
    tenure = float(row.get("tenure_months", 0))

    if recency >= 6:
        factors.append(f"No flights booked in the last {int(recency)} months")
    if avg_flights < 0.5:
        factors.append("Very low flight frequency (< 0.5 flights/month)")
    elif avg_flights < 1.0:
        factors.append("Below-average flight frequency")
    if redemption < 0.01:
        factors.append("Almost no points redemption activity")
    if redemption > 0.8:
        factors.append("Very high points redemption — possible disengagement signal")
    if tenure < 12:
        factors.append("Relatively new member — engagement still establishing")
    if not factors:
        factors.append("No significant individual risk factors detected")

    return factors[:3]  # cap at 3 for readability


# ---------------------------------------------------------------------------
# Tier mapping — map loyalty_card to airline tier nomenclature
# ---------------------------------------------------------------------------

TIER_MAP: Dict[str, str] = {
    "Aurora":   "Platinum",
    "Nova":     "Gold",
    "Star":     "Silver",
}


def _map_tier(loyalty_card: str) -> str:
    return TIER_MAP.get(str(loyalty_card).strip(), str(loyalty_card).strip())


# ---------------------------------------------------------------------------
# Churn risk score calculator
# ---------------------------------------------------------------------------

def _compute_churn_risk_score(
    predicted_churn: int,
    recency_months: float,
    avg_flights: float,
    redemption_ratio: float,
) -> float:
    """
    Compute a 0–100 churn risk score.

    Since the batch CSVs contain binary predicted_churn labels (not probabilities),
    we derive a continuous score by combining the label with behavioural features.
    Phase 3's live inference will replace this with actual model.predict_proba().

    Scoring formula:
    - Base: 30 if predicted_churn == 1, else 10
    - Recency penalty: up to +35 for inactivity
    - Flight frequency penalty: up to +20 for low flights
    - Redemption signal: up to +15
    """
    base = 30.0 if int(predicted_churn) == 1 else 10.0

    # Recency component (max 35 points)
    recency_score = min(recency_months / 12.0 * 35.0, 35.0)

    # Flight frequency component (max 20 points — inversely proportional)
    flight_score = max(0.0, (1.0 - min(avg_flights / 3.0, 1.0)) * 20.0)

    # Redemption component (max 15 points — very low OR very high both signal risk)
    redemption_distance = abs(redemption_ratio - 0.05)  # 5% is "healthy"
    redemption_score = min(redemption_distance * 100.0, 15.0)

    total = base + recency_score + flight_score + redemption_score
    return round(min(total, 100.0), 2)


# ---------------------------------------------------------------------------
# Main seeding logic
# ---------------------------------------------------------------------------

def seed() -> None:
    """
    Load CSVs, merge, transform, and upsert into MongoDB.
    """
    # --- Validation ----------------------------------------------------------
    if not MONGO_URI:
        logger.error(
            "MONGO_URI is not set. "
            "Create backend/.env from .env.example and set MONGO_URI."
        )
        sys.exit(1)

    for csv_path in [SEGMENTS_CSV, CHURN_CSV]:
        if not csv_path.exists():
            logger.error("Required CSV not found: %s", csv_path)
            sys.exit(1)

    # --- Load CSVs -----------------------------------------------------------
    logger.info("Loading customer_segments.csv  (%s)...", SEGMENTS_CSV)
    segments_df = pd.read_csv(SEGMENTS_CSV)
    logger.info("  Rows loaded: %d", len(segments_df))

    logger.info("Loading churn_predictions.csv  (%s)...", CHURN_CSV)
    churn_df = pd.read_csv(CHURN_CSV)
    logger.info("  Rows loaded: %d", len(churn_df))

    # Sanity check — must be same length for positional alignment
    if len(segments_df) != len(churn_df):
        logger.error(
            "Row count mismatch: segments=%d, churn=%d. "
            "Cannot safely merge by position.",
            len(segments_df), len(churn_df),
        )
        sys.exit(1)

    # --- Merge by position ---------------------------------------------------
    # churn_df has no loyalty_number; it is positionally aligned with segments_df.
    churn_df = churn_df.reset_index(drop=True)
    segments_df = segments_df.reset_index(drop=True)

    df = segments_df.copy()
    df["predicted_churn"] = churn_df["predicted_churn"]
    df["actual_churn"] = churn_df["actual_churn"]

    logger.info("Merged dataset: %d rows", len(df))

    # --- Connect to MongoDB --------------------------------------------------
    logger.info("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=15_000)
    client.admin.command("ping")
    logger.info("Connected.")

    db = client.get_default_database()

    # --- Upsert tenant record ------------------------------------------------
    db.tenants.update_one(
        {"tenant_id": TENANT_ID},
        {
            "$setOnInsert": {
                "tenant_id": TENANT_ID,
                "company_name": COMPANY_NAME,
            }
        },
        upsert=True,
    )
    logger.info("Tenant record ensured: %s / %s", TENANT_ID, COMPANY_NAME)

    # --- Build and upsert customer documents ---------------------------------
    operations: List[UpdateOne] = []
    processed = 0
    errors = 0

    for _, row in df.iterrows():
        try:
            loyalty_number = str(int(row["loyalty_number"]))
            member_id = f"M{loyalty_number}"

            tier = _map_tier(row.get("loyalty_card", "Star"))
            clv = round(float(row.get("clv", 0.0)), 2)
            points_balance = int(float(row.get("total_points_accumulated", 0)))
            points_redeemed = int(float(row.get("total_points_redeemed", 0)))
            total_flights = int(float(row.get("total_flights", 0)))
            avg_flights = float(row.get("avg_flights_per_month", 0))
            recency = float(row.get("recency_months", 0))
            redemption_ratio = float(row.get("points_redemption_ratio", 0))
            predicted_churn = int(row.get("predicted_churn", 0))

            persona = PERSONA_MAP.get(
                str(row.get("customer_segment", "")),
                str(row.get("customer_segment", "Unknown")),
            )

            churn_risk = _compute_churn_risk_score(
                predicted_churn, recency, avg_flights, redemption_ratio
            )

            xai_factors = _generate_xai_factors(row)

            doc: Dict[str, Any] = {
                "tenant_id": TENANT_ID,
                "member_id": member_id,
                "tier": tier,
                "clv": clv,
                "points_balance": points_balance,
                "analytics": {
                    "churn_risk_score": churn_risk,
                    "assigned_persona": persona,
                    "model_version": MODEL_VERSION,
                    "xai_factors": xai_factors,
                    # Raw features stored for Phase 3 live inference
                    "features": {
                        "avg_flights_per_month": avg_flights,
                        "points_redemption_ratio": redemption_ratio,
                        "recency_months": recency,
                        "total_flights": total_flights,
                        "points_redeemed": points_redeemed,
                        "predicted_churn_label": predicted_churn,
                    },
                },
                "campaign_tracking": {
                    "status": "Idle",
                    "updated_at": None,
                },
            }

            operations.append(
                UpdateOne(
                    {"tenant_id": TENANT_ID, "member_id": member_id},
                    {"$set": doc},
                    upsert=True,
                )
            )
            processed += 1

        except Exception as exc:  # noqa: BLE001
            errors += 1
            logger.warning("Skipping row %d — %s", _, exc)
            continue

        # Flush batch
        if len(operations) >= BATCH_SIZE:
            _flush_batch(db, operations)
            operations = []
            logger.info("  Upserted %d / %d customers...", processed, len(df))

    # Final flush
    if operations:
        _flush_batch(db, operations)

    logger.info("=" * 60)
    logger.info("Seeding complete.")
    logger.info("  Tenant  : %s", TENANT_ID)
    logger.info("  Seeded  : %d customers", processed)
    logger.info("  Skipped : %d rows (errors)", errors)
    logger.info("=" * 60)

    client.close()


def _flush_batch(db, operations: List[UpdateOne]) -> None:
    """Execute a bulk_write batch and log any partial errors."""
    try:
        db.customers.bulk_write(operations, ordered=False)
    except BulkWriteError as bwe:
        logger.warning(
            "Bulk write partial failure: %d errors in batch",
            len(bwe.details.get("writeErrors", [])),
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    seed()
