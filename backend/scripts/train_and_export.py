"""
scripts/train_and_export.py — Offline ML model training and export.

USAGE (run from the backend/ directory):
    py scripts/train_and_export.py

PURPOSE:
    Trains the exact same RandomForestClassifier pipeline used in
    ml/notebooks/03_churn_prediction.ipynb and saves the fitted model
    to backend/ml_artifacts/loyalty_model.joblib.

    This script runs OFFLINE (on your local machine) before deployment.
    The resulting .joblib file is committed to Git and deployed to Render,
    where the FastAPI backend loads it once at startup for live What-If
    inference (single-customer, on-demand only — not batch scoring).

MODEL SPEC (mirrors Notebook 03 exactly):
    Features (11):
        salary_imputed, clv, total_flights, total_distance,
        total_points_accumulated, total_points_redeemed, active_months,
        avg_flights_per_month, points_redemption_ratio,
        distance_per_flight, tenure_months

    Target: churn (binary 0/1)

    Preprocessing:
        - distance_per_flight NaN filled with 0 (as in notebook)

    Split: 80/20, random_state=42, stratify=y

    Model: RandomForestClassifier(n_estimators=200, random_state=42)

OUTPUT:
    backend/ml_artifacts/loyalty_model.joblib

    The .joblib contains a dict with:
        {
            "model": <fitted RandomForestClassifier>,
            "feature_names": [list of 11 feature column names],
            "version": "v1.0.0"
        }
    Storing feature_names alongside the model prevents silent feature
    ordering bugs if the feature list ever changes.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
SCRIPT_DIR  = Path(__file__).resolve().parent   # backend/scripts/
BACKEND_DIR = SCRIPT_DIR.parent                  # backend/
PROJECT_ROOT = BACKEND_DIR.parent                # LoyalForce/

SEGMENTS_CSV   = PROJECT_ROOT / "ml" / "outputs" / "customer_segments.csv"
OUTPUT_PATH    = BACKEND_DIR / "ml_artifacts" / "loyalty_model.joblib"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    stream=sys.stdout,
)
logger = logging.getLogger("train_and_export")

# ---------------------------------------------------------------------------
# Feature / target config — must match Notebook 03 exactly
# ---------------------------------------------------------------------------
FEATURES = [
    "salary_imputed",
    "clv",
    "total_flights",
    "total_distance",
    "total_points_accumulated",
    "total_points_redeemed",
    "active_months",
    "avg_flights_per_month",
    "points_redemption_ratio",
    "distance_per_flight",
    "tenure_months",
]
TARGET = "churn"
MODEL_VERSION = "v1.0.0"


def train() -> None:
    # -----------------------------------------------------------------------
    # 1. Load data
    # -----------------------------------------------------------------------
    logger.info("Loading dataset: %s", SEGMENTS_CSV)
    if not SEGMENTS_CSV.exists():
        logger.error("File not found: %s", SEGMENTS_CSV)
        logger.error("Run the Jupyter notebooks first to generate the CSV outputs.")
        sys.exit(1)

    df = pd.read_csv(SEGMENTS_CSV)
    logger.info("Loaded %d rows × %d columns", *df.shape)

    # -----------------------------------------------------------------------
    # 2. Prepare X, y  (exactly as in Notebook 03)
    # -----------------------------------------------------------------------
    X = df[FEATURES].copy()
    y = df[TARGET]

    # Fill the only column with NaNs (distance_per_flight) — matches notebook
    X["distance_per_flight"] = X["distance_per_flight"].fillna(0)

    logger.info("Feature matrix shape : %s", X.shape)
    logger.info("Target distribution  :\n%s", y.value_counts().to_string())

    # -----------------------------------------------------------------------
    # 3. Train / test split (matches notebook: 80/20, stratified, seed=42)
    # -----------------------------------------------------------------------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )
    logger.info("Train: %d rows | Test: %d rows", len(X_train), len(X_test))

    # -----------------------------------------------------------------------
    # 4. Train RandomForestClassifier (matches notebook exactly)
    # -----------------------------------------------------------------------
    logger.info("Training RandomForestClassifier(n_estimators=200, random_state=42) ...")
    rf_model = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
    )
    rf_model.fit(X_train, y_train)
    logger.info("Training complete.")

    # -----------------------------------------------------------------------
    # 5. Evaluate (for transparency — mirrors notebook output)
    # -----------------------------------------------------------------------
    rf_preds = rf_model.predict(X_test)
    logger.info("=== Evaluation on test set ===")
    logger.info("  Accuracy  : %.4f", accuracy_score(y_test, rf_preds))
    logger.info("  Precision : %.4f", precision_score(y_test, rf_preds))
    logger.info("  Recall    : %.4f", recall_score(y_test, rf_preds))
    logger.info("  F1        : %.4f", f1_score(y_test, rf_preds))

    # -----------------------------------------------------------------------
    # 6. Save artifact
    # -----------------------------------------------------------------------
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    artifact = {
        "model": rf_model,
        "feature_names": FEATURES,
        "version": MODEL_VERSION,
    }
    joblib.dump(artifact, OUTPUT_PATH)

    size_mb = OUTPUT_PATH.stat().st_size / (1024 * 1024)
    logger.info("=" * 60)
    logger.info("Model saved to : %s", OUTPUT_PATH)
    logger.info("File size      : %.2f MB", size_mb)
    logger.info("Features       : %s", FEATURES)
    logger.info("Version        : %s", MODEL_VERSION)
    logger.info("=" * 60)

    if size_mb > 90:
        logger.warning(
            "Model file is %.1f MB — approaching GitHub's 100 MB per-file limit. "
            "Consider reducing n_estimators or using Git LFS.",
            size_mb,
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    train()
