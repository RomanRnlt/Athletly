"""Supabase-backed data layer for activities, daily metrics, sync state.

Replaces the previous SQLite layer. Every helper is scoped by account_id;
the caller is the JWT-verified handler in main.py. All writes go through
the service-role client (RLS-bypass) so we can do upserts cleanly.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from .supabase_client import get_service_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------


_ACTIVITY_COLS = (
    "garmin_activity_id",
    "sport",
    "start_time",
    "duration_seconds",
    "distance_meters",
    "avg_hr",
    "max_hr",
    "calories",
    "training_effect",
    "vo2max_activity",
    "avg_pace_min_km",
    "elevation_gain_m",
)


def upsert_activity(account_id: str, row: dict[str, Any]) -> None:
    payload = {col: row.get(col) for col in _ACTIVITY_COLS}
    payload["account_id"] = account_id
    payload["raw_data"] = row.get("raw_data") or {}
    payload["synced_at"] = datetime.now(timezone.utc).isoformat()

    sb = get_service_client()
    sb.table("activities").upsert(
        payload,
        on_conflict="account_id,garmin_activity_id",
    ).execute()


def count_activities(account_id: str) -> int:
    sb = get_service_client()
    res = (
        sb.table("activities")
        .select("id", count="exact")
        .eq("account_id", account_id)
        .execute()
    )
    return res.count or 0


def latest_activity_date(account_id: str) -> str | None:
    sb = get_service_client()
    res = (
        sb.table("activities")
        .select("start_time")
        .eq("account_id", account_id)
        .order("start_time", desc=True)
        .limit(1)
        .execute()
    )
    if res.data and res.data[0].get("start_time"):
        return str(res.data[0]["start_time"])
    return None


def search_activities(
    account_id: str,
    sport: str | None = None,
    days: int | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    sb = get_service_client()
    q = (
        sb.table("activities")
        .select(
            "garmin_activity_id, sport, start_time, duration_seconds, "
            "distance_meters, avg_hr, avg_pace_min_km"
        )
        .eq("account_id", account_id)
    )
    if sport:
        q = q.ilike("sport", sport.strip())
    if days is not None and days > 0:
        from datetime import timedelta

        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        q = q.gte("start_time", cutoff)
    q = q.order("start_time", desc=True).limit(max(1, min(limit, 100)))
    res = q.execute()
    return list(res.data or [])


def list_activities(
    account_id: str,
    sport: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    sb = get_service_client()
    q = (
        sb.table("activities")
        .select(
            "garmin_activity_id, sport, start_time, duration_seconds, "
            "distance_meters, avg_hr, max_hr, calories, training_effect, "
            "avg_pace_min_km, elevation_gain_m"
        )
        .eq("account_id", account_id)
    )
    if sport:
        q = q.eq("sport", sport)
    q = q.order("start_time", desc=True).range(offset, offset + max(1, limit) - 1)
    res = q.execute()
    return list(res.data or [])


def distinct_sports(account_id: str) -> list[str]:
    sb = get_service_client()
    res = (
        sb.table("activities")
        .select("sport")
        .eq("account_id", account_id)
        .execute()
    )
    seen: dict[str, int] = {}
    for row in res.data or []:
        s = (row.get("sport") or "unknown").lower()
        seen[s] = seen.get(s, 0) + 1
    return sorted(seen.keys(), key=lambda s: (-seen[s], s))


def get_activity(account_id: str, garmin_activity_id: str) -> dict[str, Any] | None:
    sb = get_service_client()
    res = (
        sb.table("activities")
        .select("*")
        .eq("account_id", account_id)
        .eq("garmin_activity_id", garmin_activity_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def fetch_activities_between(
    account_id: str,
    start_date: str,
    end_date: str | None = None,
) -> list[dict[str, Any]]:
    sb = get_service_client()
    q = (
        sb.table("activities")
        .select(
            "sport, duration_seconds, distance_meters, training_effect, avg_hr, start_time"
        )
        .eq("account_id", account_id)
        .gte("start_time", start_date)
    )
    if end_date:
        q = q.lte("start_time", end_date)
    res = q.execute()
    return list(res.data or [])


# ---------------------------------------------------------------------------
# health_daily_metrics
# ---------------------------------------------------------------------------


_METRIC_COLS = (
    "resting_heart_rate",
    "hrv_avg",
    "sleep_score",
    "sleep_duration_minutes",
    "sleep_deep_minutes",
    "sleep_light_minutes",
    "sleep_rem_minutes",
    "sleep_awake_minutes",
    "stress_avg",
    "body_battery_high",
    "body_battery_low",
    "recovery_score",
    "steps",
    "active_calories",
    "total_calories",
    "vo2max",
    "intensity_minutes",
    "spo2_avg",
    "respiration_avg",
)


def upsert_daily_metric(account_id: str, row: dict[str, Any]) -> None:
    payload: dict[str, Any] = {
        "account_id": account_id,
        "date": row["date"],
        "raw_data": row.get("raw_data") or {},
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
    for col in _METRIC_COLS:
        if row.get(col) is not None:
            payload[col] = row[col]

    sb = get_service_client()
    sb.table("health_daily_metrics").upsert(
        payload,
        on_conflict="account_id,date",
    ).execute()


def get_daily_metrics(account_id: str, days: int) -> list[dict[str, Any]]:
    from datetime import timedelta

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    sb = get_service_client()
    cols = "date, " + ", ".join(_METRIC_COLS)
    res = (
        sb.table("health_daily_metrics")
        .select(cols)
        .eq("account_id", account_id)
        .gte("date", cutoff)
        .order("date", desc=True)
        .execute()
    )
    return list(res.data or [])


# ---------------------------------------------------------------------------
# sync_state
# ---------------------------------------------------------------------------


def set_sync_state(account_id: str, key: str, value: str) -> None:
    sb = get_service_client()
    sb.table("sync_state").upsert(
        {
            "account_id": account_id,
            "key": key,
            "value": value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="account_id,key",
    ).execute()


def get_sync_state(account_id: str, key: str) -> str | None:
    sb = get_service_client()
    res = (
        sb.table("sync_state")
        .select("value")
        .eq("account_id", account_id)
        .eq("key", key)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0]["value"] if rows else None


# ---------------------------------------------------------------------------
# Account-wide wipe
# ---------------------------------------------------------------------------


def wipe_account(account_id: str) -> None:
    """Delete everything for this account except the profile row.

    Profile is wiped separately by `profile.reset()` because it overwrites
    sections rather than deleting the row.
    """
    sb = get_service_client()
    for table in ("activities", "health_daily_metrics", "sync_state", "garmin_tokens"):
        sb.table(table).delete().eq("account_id", account_id).execute()
