"""Subscription tier management + RevenueCat webhook handling.

RevenueCat is the source of truth for PAID status: its webhook flips an account
to 'pro' on purchase/renewal and back to 'free' on expiry. The 'grandfather'
tier is set manually (founder / testers / early adopters), grants unlimited
credits, and is deliberately immune to RevenueCat downgrades.

RevenueCat must be configured with `app_user_id == Supabase account_id` so the
webhook maps cleanly to our users.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from .supabase_client import get_service_client

logger = logging.getLogger(__name__)

VALID_TIERS = ("free", "pro", "grandfather")

# RevenueCat event types that mean "user currently has paid access".
_ACTIVATING = {
    "INITIAL_PURCHASE",
    "RENEWAL",
    "PRODUCT_CHANGE",
    "UNCANCELLATION",
    "NON_RENEWING_PURCHASE",
    "SUBSCRIPTION_EXTENDED",
}
# Event types that mean access ended. (CANCELLATION alone does NOT end access:
# the user keeps it until period end; EXPIRATION is the real downgrade.)
_DEACTIVATING = {"EXPIRATION", "BILLING_ISSUE"}


def get_billing(account_id: str) -> dict[str, Any]:
    sb = get_service_client()
    res = (
        sb.table("account_billing")
        .select("tier, source, rc_entitlement, current_period_end, updated_at")
        .eq("account_id", account_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if rows:
        return rows[0]
    return {"tier": "free", "source": "default"}


def set_tier(
    account_id: str,
    tier: str,
    *,
    source: str,
    rc_entitlement: str | None = None,
    current_period_end: str | None = None,
) -> None:
    if tier not in VALID_TIERS:
        raise ValueError(f"unknown tier: {tier!r}")
    sb = get_service_client()
    payload: dict[str, Any] = {
        "account_id": account_id,
        "tier": tier,
        "source": source,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # Only overwrite these when provided, so a manual grant does not wipe RC data.
    if rc_entitlement is not None:
        payload["rc_entitlement"] = rc_entitlement
    if current_period_end is not None:
        payload["current_period_end"] = current_period_end
    sb.table("account_billing").upsert(payload, on_conflict="account_id").execute()
    logger.info("Tier set for %s: %s (source=%s)", account_id, tier, source)


def grant_grandfather(account_id: str) -> dict[str, Any]:
    """Give an account unlimited access. Manual, admin-only."""
    set_tier(account_id, "grandfather", source="manual")
    return get_billing(account_id)


def revoke_grandfather(account_id: str) -> dict[str, Any]:
    """Drop a grandfathered account back to free (e.g. mistaken grant)."""
    set_tier(account_id, "free", source="manual")
    return get_billing(account_id)


def _ms_to_iso(ms: Any) -> str | None:
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).isoformat()
    except (TypeError, ValueError):
        return None


def handle_revenuecat_event(payload: dict[str, Any]) -> None:
    """Apply one RevenueCat webhook event to account_billing.

    Grandfathered accounts are never touched: they keep unlimited access
    regardless of subscription state.
    """
    event = payload.get("event") or {}
    event_type = event.get("type")
    account_id = event.get("app_user_id")
    if not account_id:
        logger.warning("RevenueCat event without app_user_id: type=%s", event_type)
        return

    current = get_billing(account_id)
    if current.get("tier") == "grandfather":
        logger.info("Ignoring RC event for grandfathered account %s", account_id)
        return

    entitlement_ids = event.get("entitlement_ids") or []
    entitlement = entitlement_ids[0] if entitlement_ids else event.get("entitlement_id")

    if event_type in _ACTIVATING:
        set_tier(
            account_id,
            "pro",
            source="revenuecat",
            rc_entitlement=entitlement,
            current_period_end=_ms_to_iso(event.get("expiration_at_ms")),
        )
    elif event_type in _DEACTIVATING:
        set_tier(account_id, "free", source="revenuecat")
    else:
        # CANCELLATION, TEST, TRANSFER, etc.: log, no tier change.
        logger.info("RC event %s for %s: no tier change", event_type, account_id)
