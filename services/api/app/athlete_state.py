"""Objektiver Fitness-Snapshot aus den letzten 28 Tagen Aktivitaeten + 14 Tagen
Daily-Metrics. Code rechnet, das LLM interpretiert.

Reine Compute-Funktionen plus ein Orchestrator (`compute_state`), der die DB
anspricht und die pure Funktionen komponiert. Wird vom Tool `get_athlete_state`
in `tools.py` exponiert und gibt Plan-Agents (Generator + Evaluator) ein
faktenbasiertes Bild der echten aktuellen Fitness des Athleten, das die
Selbstauskunft im Profil ergaenzt (nicht ersetzt).

Designprinzipien:
- Robust gegen leere/None-Werte. compute_state crasht NIE bei spaerlichen Daten.
- Alle Zeiten in UTC. Datum aus start_time per str(start_time)[:10].
- Sport-Familien-Aggregation immer via plan_progress.sport_family (Single Source
  of Truth, kein duplizierter Mapping).
- ACWR Schwellen lehnen sich an die ueblichen Range-Heuristiken an (Gabbett):
  unter 0.8 = low, 0.8..1.3 = optimal/sweet spot, 1.3..1.5 = high, ueber 1.5 = spike.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from . import db
from .plan_progress import sport_family
from .tools import _PACE_SPORTS, _fmt_pace

WINDOW_ACTIVITIES_DAYS = 28
WINDOW_METRICS_DAYS = 14
ACUTE_DAYS = 7
CHRONIC_DAYS = 28

# Recovery metrics we track, in display order. Each tuple: (key in metric row,
# friendlier output name).
_RECOVERY_METRICS: tuple[tuple[str, str], ...] = (
    ("hrv_avg", "hrv"),
    ("resting_heart_rate", "resting_heart_rate"),
    ("recovery_score", "recovery_score"),
    ("sleep_score", "sleep_score"),
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _activity_date(activity: dict[str, Any]) -> str:
    return str(activity.get("start_time") or "")[:10]


def _activities_in_last_n_days(
    activities: list[dict[str, Any]],
    n: int,
    now: datetime,
) -> list[dict[str, Any]]:
    cutoff = (now - timedelta(days=n)).date()
    out: list[dict[str, Any]] = []
    for a in activities:
        date_str = _activity_date(a)
        if not date_str:
            continue
        try:
            d = datetime.fromisoformat(date_str).date()
        except ValueError:
            continue
        if d >= cutoff:
            out.append(a)
    return out


def _duration_minutes(rows: list[dict[str, Any]]) -> float:
    total = 0.0
    for r in rows:
        secs = r.get("duration_seconds") or 0
        total += secs / 60.0
    return total


def _distance_km(rows: list[dict[str, Any]]) -> float:
    total = 0.0
    for r in rows:
        meters = r.get("distance_meters") or 0
        total += meters / 1000.0
    return total


def _iso_week_start(d: datetime) -> datetime:
    """Monday 00:00 UTC for the ISO week containing d."""
    return (d - timedelta(days=d.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def _trend(values: list[float]) -> str:
    """Sign of the simple linear least-squares slope: 'up' / 'down' / 'flat'.

    Values are assumed to be in chronological order (oldest first). For very
    few data points or perfectly flat data, returns 'flat'.
    """
    n = len(values)
    if n < 3:
        return "flat"
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    num = sum((xs[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    den = sum((xs[i] - mean_x) ** 2 for i in range(n))
    if den == 0:
        return "flat"
    slope = num / den
    # Dead zone: tiny slopes (<1% of mean per step) count as flat.
    threshold = abs(mean_y) * 0.01 if mean_y else 0.05
    if slope > threshold:
        return "up"
    if slope < -threshold:
        return "down"
    return "flat"


# ---------------------------------------------------------------------------
# Pure compute functions (no I/O)
# ---------------------------------------------------------------------------


def weekly_volume(activities: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    """Current ISO week-to-date vs average of the last 4 FULL weeks.

    Returns minutes and km for both. Empty data -> zeros (not None) so the
    output shape stays stable for the LLM.
    """
    current_week_start = _iso_week_start(now)

    current: list[dict[str, Any]] = []
    last_4w: list[list[dict[str, Any]]] = [[], [], [], []]

    for a in activities:
        date_str = _activity_date(a)
        if not date_str:
            continue
        try:
            d = datetime.fromisoformat(date_str + "T00:00:00+00:00")
        except ValueError:
            continue
        if d >= current_week_start:
            current.append(a)
            continue
        # Bucket into one of the previous 4 full ISO weeks
        for i in range(4):
            wk_start = current_week_start - timedelta(days=7 * (i + 1))
            wk_end = wk_start + timedelta(days=7)
            if wk_start <= d < wk_end:
                last_4w[i].append(a)
                break

    current_min = _duration_minutes(current)
    current_km = _distance_km(current)
    avg_min_4w = sum(_duration_minutes(w) for w in last_4w) / 4.0
    avg_km_4w = sum(_distance_km(w) for w in last_4w) / 4.0

    return {
        "current_week_start": current_week_start.date().isoformat(),
        "minutes": {
            "current": round(current_min),
            "avg_4w": round(avg_min_4w),
        },
        "km": {
            "current": round(current_km, 1),
            "avg_4w": round(avg_km_4w, 1),
        },
    }


def acwr(activities: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    """Acute:chronic workload ratio on duration-minutes.

    acute = sum of minutes in the last 7d.
    chronic = average per-7d minutes across the last 28d (i.e. mean of four
    rolling weekly buckets, NOT total/4 of arbitrary period - same thing here
    but the framing makes intent clear).
    status: low <0.8, optimal 0.8..1.3, high 1.3..1.5, spike >1.5.
    Returns value=None + status='unknown' when chronic minutes are 0.
    """
    acute_rows = _activities_in_last_n_days(activities, ACUTE_DAYS, now)
    chronic_rows = _activities_in_last_n_days(activities, CHRONIC_DAYS, now)

    acute_min = _duration_minutes(acute_rows)
    chronic_min_total = _duration_minutes(chronic_rows)
    chronic_min_per_week = chronic_min_total / (CHRONIC_DAYS / 7.0)

    if chronic_min_per_week <= 0:
        return {
            "value": None,
            "status": "unknown",
            "acute_minutes": round(acute_min),
            "chronic_avg_weekly_minutes": 0,
        }

    ratio = acute_min / chronic_min_per_week
    if ratio < 0.8:
        status = "low"
    elif ratio <= 1.3:
        status = "optimal"
    elif ratio <= 1.5:
        status = "high"
    else:
        status = "spike"

    return {
        "value": round(ratio, 2),
        "status": status,
        "acute_minutes": round(acute_min),
        "chronic_avg_weekly_minutes": round(chronic_min_per_week),
    }


def sport_frequency(
    activities: list[dict[str, Any]], now: datetime
) -> list[dict[str, Any]]:
    """Count + total minutes per sport family over the last 28d, sorted desc.

    Empty input -> empty list. Each entry lists the raw Garmin sport keys we
    saw rolled into that family (helps the LLM understand the mix).
    """
    window = _activities_in_last_n_days(activities, WINDOW_ACTIVITIES_DAYS, now)
    by_family: dict[str, dict[str, Any]] = {}
    for a in window:
        sport_raw = (a.get("sport") or "unknown").lower()
        family = sport_family(sport_raw) or "unknown"
        bucket = by_family.setdefault(
            family,
            {
                "family": family,
                "sport_examples": [],
                "count": 0,
                "total_minutes": 0.0,
            },
        )
        bucket["count"] += 1
        bucket["total_minutes"] += (a.get("duration_seconds") or 0) / 60.0
        if sport_raw not in bucket["sport_examples"]:
            bucket["sport_examples"].append(sport_raw)

    out = []
    for b in by_family.values():
        out.append(
            {
                "family": b["family"],
                "sport_examples": sorted(b["sport_examples"]),
                "count": b["count"],
                "total_minutes": round(b["total_minutes"]),
            }
        )
    out.sort(key=lambda x: (-x["count"], x["family"]))
    return out


def typical_paces(
    activities: list[dict[str, Any]], now: datetime
) -> dict[str, str]:
    """Average pace per pace-relevant sport over the last 28d, weighted by
    distance. Sports limited to tools._PACE_SPORTS. Empty result -> {}.

    The average is computed as total_seconds / total_distance_km, which is
    naturally distance-weighted - no need to weight each session's pace.
    """
    window = _activities_in_last_n_days(activities, WINDOW_ACTIVITIES_DAYS, now)
    per_sport: dict[str, dict[str, float]] = {}
    for a in window:
        sport_raw = (a.get("sport") or "").lower()
        if sport_raw not in _PACE_SPORTS:
            continue
        dur = a.get("duration_seconds") or 0
        dist_m = a.get("distance_meters") or 0
        if dur <= 0 or dist_m <= 0:
            continue
        bucket = per_sport.setdefault(sport_raw, {"seconds": 0.0, "km": 0.0})
        bucket["seconds"] += dur
        bucket["km"] += dist_m / 1000.0

    out: dict[str, str] = {}
    for sport, totals in per_sport.items():
        if totals["km"] <= 0:
            continue
        pace_min_per_km = (totals["seconds"] / 60.0) / totals["km"]
        pretty = _fmt_pace(pace_min_per_km)
        if pretty:
            out[sport] = pretty
    return out


def typical_hr(
    activities: list[dict[str, Any]], now: datetime
) -> dict[str, int]:
    """Average avg_hr per sport family over the last 28d, weighted by duration.

    Sessions without avg_hr are skipped. Empty result -> {}.
    """
    window = _activities_in_last_n_days(activities, WINDOW_ACTIVITIES_DAYS, now)
    per_family: dict[str, dict[str, float]] = {}
    for a in window:
        hr = a.get("avg_hr")
        dur = a.get("duration_seconds") or 0
        if not hr or dur <= 0:
            continue
        family = sport_family((a.get("sport") or "").lower()) or "unknown"
        bucket = per_family.setdefault(family, {"hr_sec": 0.0, "sec": 0.0})
        bucket["hr_sec"] += hr * dur
        bucket["sec"] += dur

    out: dict[str, int] = {}
    for family, totals in per_family.items():
        if totals["sec"] <= 0:
            continue
        out[family] = round(totals["hr_sec"] / totals["sec"])
    return out


def recovery_baseline(
    metrics: list[dict[str, Any]], now: datetime
) -> dict[str, Any]:  # noqa: ARG001 (now kept for symmetry)
    """Average + trend per recovery metric over the last 14d.

    Metrics input may be in any order; we sort chronologically internally for
    trend calculation. A metric is omitted entirely when all 14 days are None
    (keeps output lean).
    """
    if not metrics:
        return {}

    # Chronological (oldest first) for trend calc.
    sorted_metrics = sorted(metrics, key=lambda m: m.get("date") or "")

    out: dict[str, Any] = {}
    for key, label in _RECOVERY_METRICS:
        values = [
            float(m[key])
            for m in sorted_metrics
            if m.get(key) is not None
        ]
        if not values:
            continue
        avg = sum(values) / len(values)
        out[label] = {
            "avg": round(avg, 1),
            "trend": _trend(values),
            "days_present": len(values),
        }
    return out


def longest_recent(
    activities: list[dict[str, Any]], now: datetime
) -> dict[str, Any]:
    """Longest session per sport family in the last 28d.

    Distance-based for run/ride/swim/hike/walk (km, rounded to 1 decimal),
    duration-based for strength/mobility (minutes). Only families with data.
    """
    window = _activities_in_last_n_days(activities, WINDOW_ACTIVITIES_DAYS, now)
    distance_families = {"run", "ride", "swim", "hike", "walk"}
    duration_families = {"strength", "mobility"}

    best_distance_km: dict[str, float] = {}
    best_duration_min: dict[str, float] = {}

    for a in window:
        family = sport_family((a.get("sport") or "").lower()) or "unknown"
        if family in distance_families:
            km = (a.get("distance_meters") or 0) / 1000.0
            if km > best_distance_km.get(family, 0.0):
                best_distance_km[family] = km
        elif family in duration_families:
            mins = (a.get("duration_seconds") or 0) / 60.0
            if mins > best_duration_min.get(family, 0.0):
                best_duration_min[family] = mins

    out: dict[str, Any] = {}
    for family, km in best_distance_km.items():
        if km > 0:
            out[f"{family}_km"] = round(km, 1)
    for family, mins in best_duration_min.items():
        if mins > 0:
            out[f"{family}_minutes"] = round(mins)
    return out


def last_sync_date(activities: list[dict[str, Any]]) -> str | None:
    """Most recent activity date (YYYY-MM-DD) or None."""
    dates = [_activity_date(a) for a in activities]
    dates = [d for d in dates if d]
    if not dates:
        return None
    return max(dates)


# ---------------------------------------------------------------------------
# Orchestrator (the only function that does I/O)
# ---------------------------------------------------------------------------


def compute_state(account_id: str) -> dict[str, Any]:
    """Compose the objective fitness snapshot for one athlete.

    Pulls 28d of activities + 14d of daily metrics from Supabase, then runs
    every pure compute helper. Adds `notes` for any data-quality caveats the
    LLM should weigh (e.g. very few activities). Never crashes on empty data.
    """
    now = datetime.now(timezone.utc)
    start_act = (now - timedelta(days=WINDOW_ACTIVITIES_DAYS)).date().isoformat()
    activities = db.fetch_activities_between(account_id, start_act, None)
    metrics = db.get_daily_metrics(account_id, WINDOW_METRICS_DAYS)

    notes: list[str] = []
    if not activities:
        notes.append("Keine Aktivitaeten in den letzten 28 Tagen.")
    elif len(activities) < 4:
        notes.append(
            f"Wenig Daten: nur {len(activities)} Aktivitaeten in den letzten 28 Tagen."
        )
    if not metrics:
        notes.append("Keine Daily-Metrics (HRV/RHR/Sleep) in den letzten 14 Tagen.")

    return {
        "window": {
            "activities_days": WINDOW_ACTIVITIES_DAYS,
            "metrics_days": WINDOW_METRICS_DAYS,
        },
        "last_sync_date": last_sync_date(activities),
        "weekly_volume": weekly_volume(activities, now),
        "acwr": acwr(activities, now),
        "sport_frequency": sport_frequency(activities, now),
        "typical_paces": typical_paces(activities, now),
        "typical_hr": typical_hr(activities, now),
        "recovery_baseline": recovery_baseline(metrics, now),
        "longest_recent": longest_recent(activities, now),
        "notes": notes,
    }
