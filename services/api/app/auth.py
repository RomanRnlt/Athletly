# SPDX-License-Identifier: MIT
"""JWT auth dependency for FastAPI.

Verifies Supabase access tokens via the project's JWKS endpoint (ES256
asymmetric signing keys, the Q2 2026 default). PyJWKClient caches the
public keys in-process so verification stays a local CPU operation
with no per-request network call to Supabase Auth.

HS256 + legacy JWT secret is deliberately NOT supported - the project
is post-migration and only mints ES256 tokens. If we ever need the
fallback, see git history for the dual-algorithm version.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from .config import settings

logger = logging.getLogger(__name__)


class AuthError(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


SUPPORTED_ALGORITHMS = ["ES256", "RS256"]


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL is not configured")
    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=600)


def _decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise AuthError(f"Malformed token header: {exc}") from exc

    alg = header.get("alg")
    if alg not in SUPPORTED_ALGORITHMS:
        raise AuthError(
            f"Unsupported token algorithm {alg!r}. Expected one of {SUPPORTED_ALGORITHMS}."
        )

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            algorithms=[alg],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError(f"Invalid token: {exc}") from exc
    except Exception as exc:
        raise AuthError(f"JWKS verification failed: {exc}") from exc


def get_account_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """FastAPI dependency: return the authenticated user's UUID."""
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
