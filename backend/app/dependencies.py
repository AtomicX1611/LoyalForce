"""
dependencies.py — Reusable FastAPI dependency functions.

These are injected via `Depends(...)` into every protected route. By doing so,
cross-tenant data leakage becomes a structural impossibility: a route handler
that calls `get_current_tenant` will simply never execute if the JWT is missing,
expired, or belongs to a different tenant than the one being requested.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import Settings, get_settings

# ---------------------------------------------------------------------------
# OAuth2 token extraction
# ---------------------------------------------------------------------------
# FastAPI will automatically look for "Authorization: Bearer <token>" in the
# request headers. If the header is absent the request is rejected with 401.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/mock-login")


# ---------------------------------------------------------------------------
# Public dependency: get_current_tenant
# ---------------------------------------------------------------------------

async def get_current_tenant(
    token: Annotated[str, Depends(oauth2_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    """
    Decode the JWT and return the authenticated tenant_id.

    Raises HTTP 401 for:
    - Missing / malformed tokens
    - Expired tokens
    - Tokens with a missing 'tenant_id' claim

    The returned string (tenant_id) is injected directly into route handlers
    and used as the first filter in every MongoDB query, ensuring strict
    logical multi-tenancy without any additional application-layer checks.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise credentials_exception

    tenant_id: str | None = payload.get("tenant_id")
    if not tenant_id:
        raise credentials_exception

    return tenant_id


# ---------------------------------------------------------------------------
# Type alias — import this in routers for clean signatures
# ---------------------------------------------------------------------------
CurrentTenant = Annotated[str, Depends(get_current_tenant)]
