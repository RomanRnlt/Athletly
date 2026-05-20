"""Agent tools backed by Supabase (account-scoped).

Each tool takes account_id as the first kwarg (injected by the agent loop
from the JWT). The function shape and JSON schema match what litellm
advertises to the model.
"""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import httpx

from . import db, profile
from .config import settings

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
        "date": str(row.get("start_time") or "")[:10],
        "sport": sport,
        "duration_pretty": _fmt_duration(row.get("duration_seconds")),
        "distance_km": distance_km,
        "avg_pace_pretty": pace,
        "avg_hr": row.get("avg_hr"),
    }


# ---------------------------------------------------------------------------
# Tools (each takes account_id as first kwarg)
# ---------------------------------------------------------------------------


def search_activities(
    account_id: str,
    sport: str | None = None,
    days: int | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    rows = db.search_activities(account_id, sport=sport, days=days, limit=limit)
    return {
        "activities": [_row_to_slim(r) for r in rows],
        "returned": len(rows),
        "filters": {"sport": sport, "days": days, "limit": limit},
    }


def get_activity_details(account_id: str, activity_id: str) -> dict[str, Any]:
    row = db.get_activity(account_id, activity_id)
    if not row:
        return {"error": f"Activity {activity_id} not found"}

    raw = row.get("raw_data") or {}
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
        "summary": _row_to_slim(row),
        "raw_metrics": {
            "max_hr": row.get("max_hr"),
            "calories": row.get("calories"),
            "elevation_gain_m": row.get("elevation_gain_m"),
            "vo2max_activity": row.get("vo2max_activity"),
        },
        "extras": extras,
    }


def get_daily_metrics(account_id: str, days: int = 7) -> dict[str, Any]:
    days = max(1, min(int(days), 90))
    rows = db.get_daily_metrics(account_id, days)
    return {"days_requested": days, "returned": len(rows), "metrics": rows}


def get_weekly_load(account_id: str) -> dict[str, Any]:
    now = datetime.now(timezone.utc).date()
    week_start = (now - timedelta(days=now.weekday())).isoformat()
    prev_week_start = (now - timedelta(days=now.weekday() + 7)).isoformat()
    prev_week_end = (now - timedelta(days=now.weekday() + 1)).isoformat()

    def _bucket(start: str, end: str | None) -> dict[str, Any]:
        rows = db.fetch_activities_between(account_id, start, end)
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


def read_athlete_profile(account_id: str) -> dict[str, Any]:
    sections = profile.read_sections(account_id)
    non_empty = {k: v for k, v in sections.items() if v.strip()}
    return {
        "sections": sections,
        "non_empty_sections": list(non_empty.keys()),
        "is_empty": len(non_empty) == 0,
    }


def update_athlete_section(
    account_id: str,
    section: str,
    content: str,
) -> dict[str, Any]:
    try:
        updated = profile.update_section(account_id, section, content)
    except ValueError as exc:
        return {"error": str(exc)}
    return {
        "status": "ok",
        "section": section,
        "stored_chars": len(updated[section]),
    }


def mark_onboarding_complete(account_id: str) -> dict[str, Any]:
    """Mark this account as onboarded. Idempotent."""
    profile.mark_onboarded(account_id)
    return {
        "status": "ok",
        "onboarding_completed": True,
        "filled_sections": profile.count_filled_sections(account_id),
    }


# ---------------------------------------------------------------------------
# Web search (Brave)
# ---------------------------------------------------------------------------


BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


def web_search(
    account_id: str,  # noqa: ARG001 (account scoping not used here, kept for uniform signature)
    query: str,
    count: int = 5,
) -> dict[str, Any]:
    api_key = settings.brave_search_api_key
    if not api_key:
        return {"error": "Web search not configured. Set BRAVE_SEARCH_API_KEY."}

    try:
        response = httpx.get(
            BRAVE_SEARCH_URL,
            params={"q": query, "count": max(1, min(count, 10))},
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": api_key,
            },
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        return {"error": f"Brave Search HTTP {exc.response.status_code}: {exc.response.text[:200]}"}
    except Exception as exc:
        return {"error": f"Brave Search failed: {exc}"}

    payload = response.json() or {}
    web = (payload.get("web") or {}).get("results") or []
    results = [
        {
            "title": item.get("title"),
            "url": item.get("url"),
            "snippet": item.get("description"),
            "age": item.get("age"),
        }
        for item in web[:count]
    ]
    return {"query": query, "results": results, "returned": len(results)}


# ---------------------------------------------------------------------------
# Registry + schemas
# ---------------------------------------------------------------------------


TOOL_REGISTRY: dict[str, Callable[..., dict[str, Any]]] = {
    "search_activities": search_activities,
    "get_activity_details": get_activity_details,
    "get_daily_metrics": get_daily_metrics,
    "get_weekly_load": get_weekly_load,
    "read_athlete_profile": read_athlete_profile,
    "update_athlete_section": update_athlete_section,
    "mark_onboarding_complete": mark_onboarding_complete,
    "web_search": web_search,
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
                "recovery score, body battery, stress, steps) for the last N days."
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
                "Read the current AthleteProfile. Returns the parsed sections and which "
                "ones are empty. Usually unnecessary because the profile is already injected "
                "into the system prompt - only call when you want the empty-section list."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_athlete_section",
            "description": (
                "Overwrite one section of the AthleteProfile. Use when Roman tells you "
                "something durable about himself that should outlive the current conversation. "
                "Overwrite-not-append. Section MUST be one of the closed skeleton names."
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
                        "description": "New full content for the section. Replaces what was there.",
                    },
                },
                "required": ["section", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "mark_onboarding_complete",
            "description": (
                "Mark the onboarding conversation as complete. Call this when the "
                "user has shared enough about themselves (goal, sports, life context, "
                "history, preferences) that you can coach them effectively. The skill "
                "instructions in your prompt define the exact done criteria. Idempotent."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the public web (via Brave Search) for current info you do "
                "not already know: race events, registration deadlines, training "
                "methodology articles, news. Returns title + url + snippet for the "
                "top results. Use sparingly - call only when the user asks about "
                "something specific you would otherwise have to guess (a named "
                "race, a coach's method, recent product). Do NOT call during the "
                "onboarding conversation."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query. German or English depending on the target audience of the source you want.",
                    },
                    "count": {
                        "type": "integer",
                        "description": "How many results to return (default 5, cap 10).",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weekly_load",
            "description": (
                "Compare this week vs last week: total sessions, total minutes and km, "
                "breakdown per sport, intensity split. Use for load and trend questions."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def dispatch(account_id: str, name: str, args: dict[str, Any]) -> dict[str, Any]:
    fn = TOOL_REGISTRY.get(name)
    if not fn:
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(account_id=account_id, **args)
    except TypeError as exc:
        return {"error": f"Bad arguments for {name}: {exc}"}
    except Exception as exc:
        logger.exception("Tool %s failed", name)
        return {"error": f"Tool {name} crashed: {exc}"}
