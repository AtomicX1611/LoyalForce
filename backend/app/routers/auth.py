"""
routers/auth.py — Authentication endpoints.

POST /api/auth/mock-login
    Accepts an email + airline_id pair, validates the airline_id exists in the
    `tenants` collection, and returns a signed JWT containing the tenant_id.

    This is a "mock" login because it does NOT verify a password — it is
    designed for a B2B SaaS context where the airline's internal SSO handles
    credential verification upstream. The JWT issued here is still
    cryptographically signed and carries the tenant_id claim used to enforce
    multi-tenancy on all subsequent requests.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr

from app.config import Settings, get_settings
from app.db.client import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class MockLoginRequest(BaseModel):
    email: EmailStr
    airline_id: str


class UserInfo(BaseModel):
    email: str
    tenant_id: str


class MockLoginResponse(BaseModel):
    token: str
    user: UserInfo


# ---------------------------------------------------------------------------
# Helper: create a signed JWT
# ---------------------------------------------------------------------------

def _create_access_token(
    data: Dict[str, Any],
    settings: Settings,
) -> str:
    """
    Sign a JWT with the configured secret and algorithm.

    The token payload includes:
    - sub: user email
    - tenant_id: airline tenant identifier (used by get_current_tenant)
    - exp: expiry timestamp
    - iat: issued-at timestamp
    """
    expire = datetime.now(tz=timezone.utc) + timedelta(
        minutes=settings.JWT_EXPIRE_MINUTES
    )
    payload = {
        **data,
        "exp": expire,
        "iat": datetime.now(tz=timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/mock-login",
    response_model=MockLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Issue a JWT for a validated airline tenant",
)
async def mock_login(
    body: MockLoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MockLoginResponse:
    """
    Validate the airline_id against the tenants collection and issue a JWT.

    Returns HTTP 404 if the airline_id is not a registered tenant.
    This prevents arbitrary identifiers from generating valid tokens.
    """
    tenant = await db.tenants.find_one({"tenant_id": body.airline_id})

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airline '{body.airline_id}' is not a registered tenant on this platform.",
        )

    token = _create_access_token(
        data={
            "sub": body.email,
            "tenant_id": tenant["tenant_id"],
        },
        settings=settings,
    )

    return MockLoginResponse(
        token=token,
        user=UserInfo(
            email=body.email,
            tenant_id=tenant["tenant_id"],
        ),
    )
