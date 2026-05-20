"""JWT auth dependency for FastAPI.

Verifies Supabase access tokens. Supports both:
- ES256 (new asymmetric JWT signing keys, default for Supabase projects
  created or migrated after October 2025) via the project's JWKS endpoint.
- HS256 (legacy symmetric secret) as fallback while older sessions are
  still in circulation.

The JWKS client caches public keys in-process and refreshes on miss so
verification stays a local CPU operation - no per-request network call
to Supabase Auth (the recommended pattern in the Q2 2026 docs).
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


SUPPORTED_ALGORITHMS = ["ES256", "RS256", "HS256"]


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient | None:
    """Cached JWKS client pointed at the Supabase project."""
    if not settings.supabase_url:
        return None
    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    # cache_keys keeps fetched public keys; lifespan=600s is fine, key rotation
    # is rare and the client refetches on miss anyway.
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=600)


def _decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise AuthError(f"Malformed token header: {exc}") from exc

    alg = header.get("alg")
    if alg not in SUPPORTED_ALGORITHMS:
        raise AuthError(f"Unsupported token algorithm: {alg}")

    # HS256: legacy path. Verify with the symmetric JWT secret.
    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise AuthError("SUPABASE_JWT_SECRET not set; cannot verify HS256 token")
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
            raise AuthError(f"Invalid HS256 token: {exc}") from exc

    # ES256 / RS256: asymmetric path. Resolve the public key via JWKS.
    client = _jwks_client()
    if client is None:
        raise AuthError("SUPABASE_URL not set; cannot resolve JWKS")
    try:
        signing_key = client.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            algorithms=[alg],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError(f"Invalid {alg} token: {exc}") from exc
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
