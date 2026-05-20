"""Supabase client wrappers.

The backend uses the service-role key (bypasses RLS) and manually scopes
every query by account_id - the JWT verification middleware (`auth.py`)
guarantees the caller is who they claim to be before any handler runs.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from supabase import Client, create_client

from .config import settings

logger = logging.getLogger(__name__)


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
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
