"""
main.py — FastAPI application factory.

Responsibilities:
1. Load and validate configuration (crashes on missing env vars)
2. Register the @asynccontextmanager lifespan:
   - Startup: open Motor DB connection, bootstrap indexes, load ML model (Phase 3)
   - Shutdown: close Motor connection gracefully
3. Configure global CORS middleware from validated settings
4. Mount all routers under the /api prefix
5. Add a root health-check endpoint

Do NOT add business logic here. This file is the wiring layer only.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import joblib
from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.client import close_mongo_connection, connect_to_mongo
from app.routers import auth, campaigns, customers, dashboard, predict

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application-level resources that must be initialised once on
    startup and cleaned up gracefully on shutdown.

    Startup sequence:
      1. Validate settings (already done by get_settings() import — any
         missing env var raises ValidationError before this runs)
      2. Connect Motor client to MongoDB, bootstrap indexes
      3. Load ML model into app.state (Phase 3 — currently a stub)

    Shutdown sequence:
      1. Close Motor connection pool
    """
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("LoyalForce API — Starting up")
    logger.info(f"  Host        : {settings.HOST}:{settings.PORT}")
    logger.info(f"  CORS origins: {settings.cors_origins_list}")
    logger.info(f"  Model path  : {settings.MODEL_PATH}")
    logger.info("=" * 60)

    # --- Step 1: Database ----------------------------------------------------
    await connect_to_mongo(app)

    # --- Step 2: ML Model -------------------------------------------------------
    # Load the .joblib artifact in a thread pool so the blocking I/O does not
    # stall the async event loop during startup.
    model_path = Path(settings.MODEL_PATH)
    if model_path.exists():
        artifact = await run_in_threadpool(joblib.load, str(model_path))
        app.state.ml_model = artifact["model"]
        app.state.ml_feature_names = artifact["feature_names"]
        logger.info(
            "ML model loaded from '%s' (features: %s)",
            model_path,
            artifact["feature_names"],
        )
    else:
        app.state.ml_model = None
        app.state.ml_feature_names = []
        logger.warning(
            "MODEL_PATH '%s' not found — /predict/what-if will return 503. "
            "Run: py scripts/train_and_export.py",
            model_path,
        )

    logger.info("Startup complete. Ready to serve requests.")

    # --- Yield: application is now running -----------------------------------
    yield

    # --- Shutdown ------------------------------------------------------------
    logger.info("LoyalForce API — Shutting down...")
    await close_mongo_connection(app)
    logger.info("Shutdown complete.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    """
    Construct and configure the FastAPI application.

    Separating creation from the module-level `app` object makes the factory
    easily importable for testing without triggering side effects.
    """
    settings = get_settings()  # Crashes here if .env is misconfigured

    application = FastAPI(
        title="LoyalForce — Airline Loyalty Retention API",
        description=(
            "Production-grade B2B SaaS backend for airline marketing managers. "
            "Provides churn prediction, CLV segmentation, and campaign management "
            "with strict multi-tenant data isolation."
        ),
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # --- CORS ----------------------------------------------------------------
    # Origins are read from ALLOWED_CORS_ORIGINS in .env — never hardcoded.
    # allow_origin_regex also covers all *.vercel.app preview deployments
    # so that Vercel preview branches work without updating the env var.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
        expose_headers=["X-Total-Count"],
    )

    # --- Routers -------------------------------------------------------------
    application.include_router(auth.router, prefix="/api")
    application.include_router(dashboard.router, prefix="/api")
    application.include_router(customers.router, prefix="/api")
    application.include_router(campaigns.router, prefix="/api")
    application.include_router(predict.router, prefix="/api")

    # --- Health check --------------------------------------------------------
    @application.get("/health", tags=["System"], include_in_schema=False)
    async def health_check():
        return {"status": "ok", "service": "loyalforce-api", "version": "1.0.0"}

    return application


# ---------------------------------------------------------------------------
# Module-level app instance
# ---------------------------------------------------------------------------
# Uvicorn resolves "app.main:app" to this object.
app = create_app()
