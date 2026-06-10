"""
scripts/verify_startup.py — Pre-flight validation script.

Run this BEFORE starting uvicorn to detect common configuration mistakes.
It exercises the Pydantic settings validation and database connectivity
without starting the full web server.

Usage (from backend/ directory):
    py scripts/verify_startup.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Ensure backend/ is on the path when running from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def check_env() -> bool:
    print("\n[1/3] Checking Pydantic settings validation...")
    try:
        from app.config import get_settings
        settings = get_settings()
        print(f"  ✓ MONGO_URI  : {'*' * 20}...  (set)")
        print(f"  ✓ JWT_SECRET : {'*' * 20}...  (set, length={len(settings.JWT_SECRET)})")
        print(f"  ✓ CORS       : {settings.cors_origins_list}")
        print(f"  ✓ MODEL_PATH : {settings.MODEL_PATH}")
        print(f"  ✓ PORT/HOST  : {settings.HOST}:{settings.PORT}")
        return True
    except Exception as exc:
        print(f"  ✗ Settings validation FAILED: {exc}")
        return False


async def check_db() -> bool:
    print("\n[2/3] Testing MongoDB connectivity...")
    try:
        from app.config import get_settings
        from motor.motor_asyncio import AsyncIOMotorClient
        settings = get_settings()
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=10_000)
        await client.admin.command("ping")
        client.close()
        print("  ✓ MongoDB ping successful")
        return True
    except Exception as exc:
        print(f"  ✗ MongoDB connection FAILED: {exc}")
        return False


def check_model_path() -> bool:
    print("\n[3/3] Checking ML model artifact...")
    try:
        from app.config import get_settings
        settings = get_settings()
        model_path = Path(settings.MODEL_PATH)
        if model_path.exists():
            size_mb = model_path.stat().st_size / (1024 * 1024)
            print(f"  ✓ Model found: {model_path} ({size_mb:.1f} MB)")
        else:
            print(f"  ⚠  Model NOT found at: {model_path}")
            print("     This is expected before Phase 3. The API will start but")
            print("     POST /api/predict/what-if will return HTTP 503 until the model is placed here.")
        return True
    except Exception as exc:
        print(f"  ✗ Model path check failed: {exc}")
        return False


async def main() -> None:
    print("=" * 60)
    print("LoyalForce Backend — Pre-flight Verification")
    print("=" * 60)

    env_ok = check_env()
    if not env_ok:
        print("\n✗ FAILED — fix your .env file before starting the server.")
        sys.exit(1)

    db_ok = await check_db()
    check_model_path()

    print("\n" + "=" * 60)
    if db_ok:
        print("✓ All checks passed. Server is ready to start.")
        print("  Run: py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    else:
        print("⚠  Settings OK but MongoDB unreachable — check your MONGO_URI.")
        print("  The server will still start but all DB routes will fail.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
