# SPDX-License-Identifier: MIT
"""GDPR consent records for processing health data (Art. 9) via the LLM.

Append-only audit trail in `user_consents`: every grant or withdrawal is a new
row, the current state is the most recent row per (account_id, consent_type).
This lets us demonstrate consent under Art. 7(1), including timestamp and the
policy version that was in force.

Bump CURRENT_CONSENT_VERSION whenever the wording of what the user agrees to
materially changes. A user whose latest grant is on an older version is treated
as `needs_consent` again, so the app re-prompts.
"""

from __future__ import annotations

import logging
from typing import Any

from .supabase_client import get_service_client

logger = logging.getLogger(__name__)

HEALTH_DATA_PROCESSING = "health_data_processing"
CURRENT_CONSENT_VERSION = "1.0"


def _latest(account_id: str, consent_type: str) -> dict[str, Any] | None:
    sb = get_service_client()
    res = (
        sb.table("user_consents")
        .select("granted, version, created_at")
        .eq("account_id", account_id)
        .eq("consent_type", consent_type)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def get_status(account_id: str) -> dict[str, Any]:
    """Current consent state for health-data processing.

    `needs_consent` is True when the user has never granted, has withdrawn, or
    only granted an older policy version than the one currently in force.
    """
    latest = _latest(account_id, HEALTH_DATA_PROCESSING)
    granted_current = bool(
        latest
        and latest.get("granted")
        and latest.get("version") == CURRENT_CONSENT_VERSION
    )
    return {
        "consent_type": HEALTH_DATA_PROCESSING,
        "granted": bool(latest and latest.get("granted")),
        "version": latest.get("version") if latest else None,
        "current_version": CURRENT_CONSENT_VERSION,
        "needs_consent": not granted_current,
        "updated_at": latest.get("created_at") if latest else None,
    }


def has_health_consent(account_id: str) -> bool:
    """True when the user has a valid, current-version consent on record."""
    return not get_status(account_id)["needs_consent"]


def record_consent(
    account_id: str,
    *,
    granted: bool,
    version: str = CURRENT_CONSENT_VERSION,
    consent_type: str = HEALTH_DATA_PROCESSING,
) -> dict[str, Any]:
    """Append a consent decision and return the resulting status."""
    sb = get_service_client()
    sb.table("user_consents").insert(
        {
            "account_id": account_id,
            "consent_type": consent_type,
            "version": version,
            "granted": granted,
        }
    ).execute()
    logger.info(
        "Consent recorded for %s: type=%s granted=%s version=%s",
        account_id,
        consent_type,
        granted,
        version,
    )
    return get_status(account_id)


def history(account_id: str) -> list[dict[str, Any]]:
    """Full consent audit trail for this account, newest first.

    Used by the data export (Art. 20) so the user gets their consent record too.
    """
    sb = get_service_client()
    res = (
        sb.table("user_consents")
        .select("consent_type, version, granted, created_at")
        .eq("account_id", account_id)
        .order("created_at", desc=True)
        .execute()
    )
    return list(res.data or [])
