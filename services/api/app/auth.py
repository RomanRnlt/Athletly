"""JWT auth dependency for FastAPI.

Verifies the Supabase access token in the Authorization header against
SUPABASE_JWT_SECRET (HS256) and exposes the account_id (uuid) as a
FastAPI dependency.
"""

from __future__ import annotations

import logging
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status

from .config import settings

logger = logging.getLogger(__name__)


class AuthError(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


def _decode_token(token: str) -> dict:
    if not settings.supabase_jwt_secret:
        raise AuthError("SUPABASE_JWT_SECRET not configured on the server")
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError(f"Invalid token: {exc}") from exc


def get_account_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """FastAPI dependency: return the authenticated user's UUID.

    Raises 401 when the Authorization header is missing, malformed, or the
    token does not verify against SUPABASE_JWT_SECRET.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("Missing or malformed Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise AuthError("Empty bearer token")

    payload = _decode_token(token)
    account_id = payload.get("sub")
    if not isinstance(account_id, str) or len(account_id) == 0:
        raise AuthError("Token is missing 'sub' claim")
    return account_id
