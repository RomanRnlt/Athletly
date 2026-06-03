# SPDX-License-Identifier: MIT
"""Account-level data export (GDPR Art. 20) and full erasure (Art. 17).

Both operate via the service-role client and are always scoped by the
JWT-verified account_id passed in by the handler in main.py.

Export returns everything we hold about the user in a portable JSON shape,
deliberately EXCLUDING the stored Garmin credentials/tokens (those are secrets,
not the user's own data to port). Erasure wipes every account-scoped row and
then deletes the auth user; all our tables reference auth.users with
`on delete cascade`, so the auth deletion is the backstop that guarantees
nothing is left behind.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from . import consent, db, garmin, profile
from .supabase_client import get_service_client

logger = logging.getLogger(__name__)

# Tables exported verbatim (all columns). garmin_tokens is intentionally NOT
# here: it holds opaque login tokens, which are secrets rather than portable
# user data. The connection metadata is exported separately, token-free.
_EXPORT_TABLES: tuple[str, ...] = (
    "activities",
    "health_daily_metrics",
    "training_plans",
    "sync_state",
)

# Tables wiped explicitly before deleting the auth user. Mirrors every table
# that references auth.users(id); the cascade would catch these anyway, but
# doing it explicitly keeps deletion correct even if a future table forgets
# its cascade, and makes the intent auditable.
_DELETE_TABLES: tuple[str, ...] = (
    "activities",
    "health_daily_metrics",
    "training_plans",
    "sync_state",
    "garmin_tokens",
    "athlete_profiles",
    "user_consents",
)


def export_data(account_id: str) -> dict[str, Any]:
    """Assemble a portable snapshot of all data held for this account."""
    sb = get_service_client()
    out: dict[str, Any] = {
        "account_id": account_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "format_version": "1.0",
    }

    for table in _EXPORT_TABLES:
        res = sb.table(table).select("*").eq("account_id", account_id).execute()
        out[table] = list(res.data or [])

    out["athlete_profile"] = profile.read_sections_ordered(account_id)

    # Garmin connection metadata only, never the tokens.
    status = garmin.get_status(account_id)
    out["garmin_connection"] = {
        key: status.get(key)
        for key in (
            "connected",
            "display_name",
            "email",
            "connected_since",
            "last_sync_at",
            "activity_count",
        )
    }

    out["consents"] = consent.history(account_id)
    return out


def delete_account(account_id: str) -> None:
    """Irreversibly erase the account: all data rows, then the auth user."""
    sb = get_service_client()

    for table in _DELETE_TABLES:
        try:
            sb.table(table).delete().eq("account_id", account_id).execute()
        except Exception:
            logger.exception("Failed wiping table %s for %s", table, account_id)
            raise

    # Delete the auth user last. This also cascades anything we might have
    # missed. If this fails we surface the error so the caller does not report
    # a successful deletion.
    try:
        sb.auth.admin.delete_user(account_id)
    except Exception:
        logger.exception("Failed deleting auth user %s", account_id)
        raise

    logger.info("Account fully deleted: %s", account_id)
