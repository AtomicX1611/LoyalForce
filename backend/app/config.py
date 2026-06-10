"""
config.py — Pydantic BaseSettings validation layer.

ALL required environment variables are declared here with NO default values.
If any variable is absent from the .env file at startup, Pydantic will raise
a ValidationError and the application will refuse to start. This is intentional:
a misconfigured server must never silently serve requests.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application configuration.

    Reads values from the .env file (or the process environment).
    Every field without a default is strictly required — missing values
    cause a crash-on-startup ValidationError by design.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",      # silently discard unknown env vars
    )

    # ------------------------------------------------------------------ Server
    PORT: int = Field(default=8000, description="Uvicorn listening port")
    HOST: str = Field(default="0.0.0.0", description="Uvicorn bind address")

    # ---------------------------------------------------------------- Database
    MONGO_URI: str = Field(
        description="Full MongoDB connection URI — REQUIRED. No default."
    )

    # ----------------------------------------------------------- JWT / Auth
    JWT_SECRET: str = Field(
        description="Cryptographic signing key — REQUIRED. No default."
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )
    JWT_EXPIRE_MINUTES: int = Field(
        default=480,
        description="Token validity window in minutes (default 8 hours)"
    )

    # -------------------------------------------------------------------- CORS
    ALLOWED_CORS_ORIGINS: str = Field(
        description=(
            "Comma-separated list of allowed origins — REQUIRED. "
            "Example: http://localhost:5173,https://app.example.com"
        )
    )

    # Parsed list property — do not override as an env var.
    @property
    def cors_origins_list(self) -> List[str]:
        """Split the raw comma-separated string into a clean list."""
        return [o.strip() for o in self.ALLOWED_CORS_ORIGINS.split(",") if o.strip()]

    # ---------------------------------------------------------------- ML Model
    MODEL_PATH: str = Field(
        default="./ml_artifacts/loyalty_model.joblib",
        description="Path to the serialised scikit-learn pipeline (joblib)"
    )

    # --------------------------------------------------- Seed Utility (optional)
    SEED_TENANT_ID: str = Field(
        default="northern_lights_air",
        description="Tenant ID used by the seed_db.py utility script"
    )
    SEED_COMPANY_NAME: str = Field(
        default="Northern Lights Air",
        description="Human-readable company name for the seeded tenant"
    )

    # ------------------------------------------------------------ Validators
    @field_validator("JWT_SECRET")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "JWT_SECRET must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(64))\""
            )
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached singleton Settings instance.

    Using lru_cache means the .env file is parsed exactly once for the
    lifetime of the process — identical to reading config at module import
    time but friendlier to testing (cache can be cleared with
    get_settings.cache_clear()).
    """
    return Settings()
