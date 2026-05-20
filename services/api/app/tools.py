"""Agent tools for querying Garmin-synced SQLite data.

Each tool is a plain Python function returning a JSON-serializable dict, plus
an OpenAI-compatible JSON schema description so litellm can advertise it to
any supported model. The agent loop in ``app.agent`` dispatches by tool name.
"""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from . import db, profile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _fmt_duration(seconds: int | None) -> str | None:
    if not seconds:
        return None
    h, rem = divmod(int(seconds), 3600)
    m, s = divmod(rem, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _fmt_pace(pace_min_km: float | None) -> str | None:
    if pace_min_km is None or pace_min_km <= 0:
        return None
    minutes = int(pace_min_km)
    seconds = round((pace_min_km - minutes) * 60)
    if seconds == 60:
        minutes += 1
        seconds = 0
    return f"{minutes}:{seconds:02d}/km"


_PACE_SPORTS = {"running", "trail_running", "treadmill_running", "track_running", "hiking"}


def _row_to_slim(row: dict[str, Any]) -> dict[str, Any]:
    sport = (row.get("sport") or "unknown").lower()
    distance_km = (
        round(row["distance_meters"] / 1000, 2) if row.get("distance_meters") else None
    )
    pace = _fmt_pace(row.get("avg_pace_min_km")) if sport in _PACE_SPORTS else None
    return {
        "id": row.get("garmin_activity_id"),
        "date": (row.get("start_time") or "")[:10],
        "sport": sport,
        "duration_pretty": _fmt_duration(row.get("duration_seconds")),
        "distance_km": distance_km,
        "avg_pace_pretty": pace,
        "avg_hr": row.get("avg_hr"),
    }


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


def search_activities(
    sport: str | None = None,
    days: int | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    where: list[str] = []
    params: list[Any] = []
    if sport:
        where.append("LOWER(sport) = ?")
        params.append(sport.strip().lower())
    if days is not None and days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        where.append("start_time >= ?")
        params.append(cutoff)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    limit = max(1, min(limit, 100))
    sql = (
        f"SELECT garmin_activity_id, sport, start_time, duration_seconds, "
        f"distance_meters, avg_hr, avg_pace_min_km FROM activities "
        f"{where_sql} ORDER BY start_time DESC LIMIT ?"
    )
    params.append(limit)

    with db.connect() as conn:
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]

    return {
        "activities": [_row_to_slim(r) for r in rows],
        "returned": len(rows),
        "filters": {"sport": sport, "days": days, "limit": limit},
    }


def get_activity_details(activity_id: str) -> dict[str, Any]:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT * FROM activities WHERE garmin_activity_id = ?",
            (activity_id,),
        ).fetchone()
    if not row:
        return {"error": f"Activity {activity_id} not found"}

    row_dict = dict(row)
    raw_json = row_dict.pop("raw_data", None)
    raw: dict[str, Any] = {}
    if raw_json:
        try:
            raw = json.loads(raw_json)
        except Exception:
            raw = {}

    # Pull selected coaching-relevant fields out of the raw Garmin payload.
    extras = {
        "training_effect_aerobic": raw.get("aerobicTrainingEffect"),
        "training_effect_anaerobic": raw.get("anaerobicTrainingEffect"),
        "training_effect_label": raw.get("trainingEffectLabel"),
        "avg_cadence": raw.get("averageRunningCadenceInStepsPerMinute")
        or raw.get("averageBikingCadenceInRevPerMinute"),
        "avg_power_w": raw.get("avgPower"),
        "max_power_w": raw.get("maxPower"),
        "normalized_power_w": raw.get("normPower"),
        "elevation_loss_m": raw.get("elevationLoss"),
        "min_elevation_m": raw.get("minElevation"),
        "max_elevation_m": raw.get("maxElevation"),
        "moving_duration_s": raw.get("movingDuration"),
        "lap_count": raw.get("lapCount"),
        "device": raw.get("deviceName"),
        "location": raw.get("locationName"),
        "activity_name": raw.get("activityName"),
    }
    extras = {k: v for k, v in extras.items() if v is not None}

    return {
        "summary": _row_to_slim(row_dict),
        "raw_metrics": {
            "max_hr": row_dict.get("max_hr"),
            "calories": row_dict.get("calories"),
            "elevation_gain_m": row_dict.get("elevation_gain_m"),
            "vo2max_activity": row_dict.get("vo2max_activity"),
        },
        "extras": extras,
    }


_METRIC_COLUMNS = (
    "date",
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
    "vo2max",
    "intensity_minutes",
)


def get_daily_metrics(days: int = 7) -> dict[str, Any]:
    days = max(1, min(int(days), 90))
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    cols = ", ".join(_METRIC_COLUMNS)
    sql = f"SELECT {cols} FROM health_daily_metrics WHERE date >= ? ORDER BY date DESC"
    with db.connect() as conn:
        rows = [dict(r) for r in conn.execute(sql, (cutoff,)).fetchall()]

    return {"days_requested": days, "returned": len(rows), "metrics": rows}


def get_weekly_load() -> dict[str, Any]:
    now = datetime.now(timezone.utc).date()
    week_start = (now - timedelta(days=now.weekday())).isoformat()
    prev_week_start = (now - timedelta(days=now.weekday() + 7)).isoformat()
    prev_week_end = (now - timedelta(days=now.weekday() + 1)).isoformat()

    def _bucket(start: str, end: str | None) -> dict[str, Any]:
        if end:
            sql = (
                "SELECT sport, duration_seconds, distance_meters, training_effect, avg_hr "
                "FROM activities WHERE date(start_time) >= ? AND date(start_time) <= ?"
            )
            params: tuple[Any, ...] = (start, end)
        else:
            sql = (
                "SELECT sport, duration_seconds, distance_meters, training_effect, avg_hr "
                "FROM activities WHERE date(start_time) >= ?"
            )
            params = (start,)
        with db.connect() as conn:
            rows = [dict(r) for r in conn.execute(sql, params).fetchall()]

        total_seconds = 0
        total_km = 0.0
        per_sport: dict[str, dict[str, float | int]] = defaultdict(
            lambda: {"sessions": 0, "duration_minutes": 0, "distance_km": 0.0}
        )
        intensity = {"easy": 0, "moderate": 0, "hard": 0}
        for r in rows:
            dur = r.get("duration_seconds") or 0
            dist = (r.get("distance_meters") or 0) / 1000
            sport = (r.get("sport") or "unknown").lower()
            total_seconds += dur
            total_km += dist
            per_sport[sport]["sessions"] += 1
            per_sport[sport]["duration_minutes"] += round(dur / 60)
            per_sport[sport]["distance_km"] += round(dist, 2)
            te = r.get("training_effect") or 0
            if te >= 4:
                intensity["hard"] += 1
            elif te >= 2.5:
                intensity["moderate"] += 1
            elif te > 0:
                intensity["easy"] += 1

        return {
            "sessions": len(rows),
            "total_minutes": round(total_seconds / 60),
            "total_km": round(total_km, 2),
            "per_sport": {k: dict(v) for k, v in per_sport.items()},
            "intensity": intensity,
        }

    return {
        "current_week_start": week_start,
        "current": _bucket(week_start, None),
        "previous": _bucket(prev_week_start, prev_week_end),
    }


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


def read_athlete_profile() -> dict[str, Any]:
    sections = profile.read_sections()
    non_empty = {k: v for k, v in sections.items() if v.strip()}
    return {
        "sections": sections,
        "non_empty_sections": list(non_empty.keys()),
        "is_empty": len(non_empty) == 0,
    }


def update_athlete_section(section: str, content: str) -> dict[str, Any]:
    try:
        updated = profile.update_section(section, content)
    except ValueError as exc:
        return {"error": str(exc)}
    return {
        "status": "ok",
        "section": section,
        "stored_chars": len(updated[section]),
    }


TOOL_REGISTRY: dict[str, Callable[..., dict[str, Any]]] = {
    "search_activities": search_activities,
    "get_activity_details": get_activity_details,
    "get_daily_metrics": get_daily_metrics,
    "get_weekly_load": get_weekly_load,
    "read_athlete_profile": read_athlete_profile,
    "update_athlete_section": update_athlete_section,
}


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_activities",
            "description": (
                "List recent activities newest first, with optional sport + days filters. "
                "Returns slim summaries (id, date, sport, duration, distance, pace, avg_hr). "
                "Call this FIRST when the user asks about a workout. "
                "Use get_activity_details for one specific activity once you have the id."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sport": {
                        "type": "string",
                        "description": "Filter by sport key like 'running', 'cycling', 'swimming', 'strength_training'. Omit for all sports.",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Only activities from the last N days. Omit for no time filter.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results (default 10, cap 100).",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_activity_details",
            "description": (
                "Full details for ONE activity by id: training effect (aerobic + anaerobic), "
                "power, cadence, elevation profile, VO2max from device, max HR. "
                "Only call when you have a concrete activity id from search_activities."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "activity_id": {
                        "type": "string",
                        "description": "Garmin activity id from search_activities output.",
                    },
                },
                "required": ["activity_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_daily_metrics",
            "description": (
                "Daily health metrics (sleep score + minutes by phase, HRV, resting HR, "
                "recovery score, body battery, stress, steps) for the last N days. "
                "Use to answer recovery, sleep, or readiness questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days back from today (default 7, cap 90).",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_athlete_profile",
            "description": (
                "Read the current AthleteProfile (markdown file Roman can also edit "
                "directly). Returns the parsed sections and which ones are empty. "
                "Call this when you need context Roman has told you about himself "
                "in past conversations: his goals, his life constraints, his "
                "training history, his preferences. The profile is ALWAYS injected "
                "into the system prompt non-empty, so usually you do NOT need to "
                "call this - only call when you suspect Roman has edited the file "
                "manually or you need the empty-section list to know what is still "
                "missing."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_athlete_section",
            "description": (
                "Overwrite one section of the AthleteProfile with new prose. Use "
                "when Roman tells you something durable about himself that should "
                "outlive the current conversation: a goal, a life constraint, an "
                "injury, a preference for how you talk to him, an experience. "
                "Overwrite-not-append: the new content REPLACES the section, "
                "merge with what's already there if you want to keep older lines. "
                "Section MUST be one of the exact strings: 'Warum ich trainiere', "
                "'Sportarten & Rollen', 'Nicht verhandelbar (Leben & Kontext)', "
                "'Wie ich auf Belastung reagiere', 'Geschichte & Erfahrung', "
                "'Coaching-Stil & Praeferenzen'. Do NOT log every chat fact - only "
                "things that matter beyond this conversation."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {
                        "type": "string",
                        "description": "Exact section name from the closed skeleton.",
                        "enum": list(profile.SECTIONS),
                    },
                    "content": {
                        "type": "string",
                        "description": "New full content for the section. Replaces what was there. Keep tight, max ~2000 chars.",
                    },
                },
                "required": ["section", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weekly_load",
            "description": (
                "Compare this week vs last week: total sessions, total minutes and km, "
                "breakdown per sport, intensity split (easy / moderate / hard via training effect). "
                "Use for load, volume, and trend questions."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def dispatch(name: str, args: dict[str, Any]) -> dict[str, Any]:
    fn = TOOL_REGISTRY.get(name)
    if not fn:
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(**args)
    except TypeError as exc:
        return {"error": f"Bad arguments for {name}: {exc}"}
    except Exception as exc:
        logger.exception("Tool %s failed", name)
        return {"error": f"Tool {name} crashed: {exc}"}
