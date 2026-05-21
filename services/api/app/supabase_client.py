"""Supabase client wrappers.

The backend uses the service-role key (bypasses RLS) and manually scopes
every query by account_id - the JWT verification middleware (`auth.py`)
guarantees the caller is who they claim to be before any handler runs.
"""

from __future__ import annotations

import logging
from functools import lru_cache

import httpx
from supabase import Client, ClientOptions, create_client

from .config import settings

logger = logging.getLogger(__name__)


def _build_httpx_client() -> httpx.Client:
    """Custom transport for the postgrest client.

    The postgrest default negotiates HTTP/2, whose multiplexing intermittently
    raises RemoteProtocolError (ConnectionTerminated / GOAWAY) against Supabase
    under back-to-back queries (seen during plan generation: the agent fires
    several reads in quick succession). Forcing HTTP/1.1 removes that failure
    class; transport-level retries cover transient connect errors. A short
    keepalive expiry drops idle connections before the server closes them, so
    we never reuse a stale socket.
    """
    transport = httpx.HTTPTransport(http2=False, retries=2)
    return httpx.Client(
        timeout=httpx.Timeout(30.0),
        limits=httpx.Limits(max_keepalive_connections=5, keepalive_expiry=20.0),
        transport=transport,
    )


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    """Return the service-role Supabase client.

    Cached so we don't reconnect per request. The service role key bypasses
    RLS, so handlers MUST scope queries by account_id.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
        )
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
        options=ClientOptions(httpx_client=_build_httpx_client()),
    )
