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
# Universal session grammar (ADR 0001): ONE shape for every sport. A session
# is Session Core (date/sport/intent/headline/load/status) plus depth-1
# groups -> steps. All real numbers (km, sets, reps, watts, pace, kg) live in
# step targets/prescriptions, never on the session itself. These schemas are
# strict FORM contracts (closed enums + required keys + nullable leaves), not
# domain logic; the plan/evaluate skills own every training judgment.
# ---------------------------------------------------------------------------

SESSION_INTENTS = [
    "recovery", "aerobic_base", "tempo", "threshold",
    "vo2max", "strength", "skill", "competition",
]
GROUP_MODES = ["fixed", "for_time", "amrap", "emom"]
STEP_ROLES = ["warmup", "work", "recovery", "rest", "cooldown"]
TARGET_KINDS = ["time", "distance", "reps", "open"]
PRESCRIPTION_KINDS = ["pace", "hr", "power", "rpe", "load", "none"]

TARGET_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "kind": {
            "type": "string",
            "enum": TARGET_KINDS,
            "description": "What is measured. time->seconds, distance->meters, reps->count, open->no amount.",
        },
        "amount": {
            "type": ["number", "null"],
            "description": (
                "The number in canonical units (time=seconds, distance=meters, "
                "reps=count). MUST be null when kind='open', non-null otherwise."
            ),
        },
        "unit": {
            "type": "string",
            "description": "Display hint only (e.g. 'km','m','reps',''). Storage stays canonical in amount.",
        },
    },
    "required": ["kind", "amount", "unit"],
}

PRESCRIPTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "kind": {
            "type": "string",
            "enum": PRESCRIPTION_KINDS,
            "description": "How hard. Use 'none' for steps with no intensity target (e.g. rest).",
        },
        "value": {
            "type": ["string", "null"],
            "description": (
                "Absolute resolved point value, e.g. '3:58/km','155bpm','250W',"
                "'RPE 7','100kg'. null when using rng or kind='none'."
            ),
        },
        "rng": {
            "type": ["array", "null"],
            "items": {"type": "number"},
            "minItems": 2,
            "maxItems": 2,
            "description": "Optional [low, high] numeric range instead of a point value, else null.",
        },
    },
    "required": ["kind", "value", "rng"],
}

STEP_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "role": {"type": "string", "enum": STEP_ROLES},
        "target": TARGET_SCHEMA,
        "prescription": PRESCRIPTION_SCHEMA,
        "movement": {
            "type": "string",
            "description": (
                "Free-text exercise / muscle focus (e.g. 'Squat','Bench Press'). "
                "Empty string for implicit moves like running or swimming."
            ),
        },
        "note": {"type": "string", "description": "Optional cue, else empty string."},
    },
    "required": ["role", "target", "prescription", "movement", "note"],
}

GROUP_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "mode": {
            "type": "string",
            "enum": GROUP_MODES,
            "description": "Execution mode. fixed=set rounds; for_time/amrap/emom=functional formats.",
        },
        "label": {
            "type": "string",
            "description": "Optional block name (e.g. 'Push Day','Main set'), else empty string.",
        },
        "rounds": {"type": ["integer", "null"], "description": "Rounds for mode 'fixed', else null."},
        "cap_s": {"type": ["integer", "null"], "description": "Time cap in seconds for for_time/amrap/emom, else null."},
        "interval_s": {"type": ["integer", "null"], "description": "EMOM interval in seconds, else null."},
        "steps": {
            "type": "array",
            "items": STEP_SCHEMA,
            "description": (
                "Depth-1 step sequence. NEVER nest groups; write ladders/pyramids "
                "as explicit steps."
            ),
        },
    },
    "required": ["mode", "label", "rounds", "cap_s", "interval_s", "steps"],
}

SESSION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "date": {"type": "string", "description": "ISO date YYYY-MM-DD."},
        "sport": {
            "type": "string",
            "description": "Any sport key, generic (e.g. 'running','gym','cycling','swimming').",
        },
        "intent": {
            "type": "string",
            "enum": SESSION_INTENTS,
            "description": "Primary training intent of the session.",
        },
        "headline": {
            "type": "string",
            "description": "Short human-readable summary, e.g. 'Squat 4x6, Dips EMOM, Wall Balls AMRAP'.",
        },
        "load": {"type": ["number", "null"], "description": "Estimated training load (arbitrary scale), or null."},
        "status": {"type": "string", "description": "Lifecycle status; use 'planned' for new sessions."},
        "groups": {
            "type": "array",
            "items": GROUP_SCHEMA,
            "description": "Structured blocks. Empty array for unstructured activity (headline only).",
        },
    },
    "required": ["date", "sport", "intent", "headline", "groups"],
}

DAY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "date": {"type": "string", "description": "ISO date YYYY-MM-DD."},
        "sessions": {
            "type": "array",
            "items": SESSION_SCHEMA,
            "description": "Zero or more sessions. Empty array = rest day (set rest_reason).",
        },
        "rest_reason": {"type": "string", "description": "Why this is a rest day. Only when sessions is empty."},
    },
    "required": ["date", "sessions"],
}

WEEK_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "week_start": {"type": "string", "description": "Monday, ISO date."},
        "coach_message": {"type": "string", "description": "Short framing of the week for the athlete."},
        "days": {"type": "array", "items": DAY_SCHEMA},
    },
    "required": ["week_start", "days"],
}

# rationale FIRST: reasoning before the conclusion (weeks) lifts output quality.
PLAN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "rationale": {
            "type": "string",
            "description": (
                "Why this plan: the science + sources, how it serves the athlete's "
                "goal, current load, recovery state, and constraints."
            ),
        },
        "weeks": {
            "type": "array",
            "items": WEEK_SCHEMA,
            "description": "Exactly 2 weeks, exactly 7 day objects each (Mon-Sun), 14 days total.",
        },
    },
    "required": ["rationale", "weeks"],
}

# Evaluator verdict. summary/issues/suggestions/score come BEFORE the boolean
# (reasoning before conclusion); only summary + approved are required.
EVALUATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "One-paragraph verdict, written before the decision."},
        "issues": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Concrete, actionable problems (name the day + what is wrong).",
        },
        "suggestions": {"type": "array", "items": {"type": "string"}, "description": "Concrete improvements."},
        "score": {"type": "integer", "description": "0-100 quality score."},
        "approved": {"type": "boolean", "description": "True only when no material problems remain."},
    },
    "required": ["summary", "approved"],
}


# Named schema registry: lets SKILL.md frontmatter reference a terminal/spawn
# schema by name (e.g. `terminal_schema: PLAN_SCHEMA`) instead of inlining the
# big JSON in YAML. The schemas stay typed and reusable here in Python.
SCHEMA_REGISTRY: dict[str, dict[str, Any]] = {
    "PLAN_SCHEMA": PLAN_SCHEMA,
    "EVALUATION_SCHEMA": EVALUATION_SCHEMA,
}


# ---------------------------------------------------------------------------
# Plan revision tools (jsonb passthrough; the model decides the edits)
# ---------------------------------------------------------------------------


def get_current_plan(account_id: str) -> dict[str, Any]:
    from . import db

    row = db.get_plan_by_status(account_id, "draft") or db.get_plan_by_status(
        account_id, "active"
    )
    if not row:
        return {"has_plan": False}
    return {
        "has_plan": True,
        "plan_id": row["id"],
        "status": row["status"],
        "rationale": row.get("rationale"),
        "weeks": (row.get("plan_data") or {}).get("weeks", []),
    }


def update_plan(
    account_id: str,
    weeks: list[dict[str, Any]],
    rationale: str | None = None,
) -> dict[str, Any]:
    from . import db

    row = db.get_plan_by_status(account_id, "draft") or db.get_plan_by_status(
        account_id, "active"
    )
    if not row:
        return {"error": "Kein Plan zum Bearbeiten vorhanden"}
    updated = db.update_plan(
        account_id,
        row["id"],
        plan_data={"weeks": weeks},
        rationale=rationale,
    )
    return {"status": "ok", "plan_id": row["id"], "updated": updated is not None}


def confirm_plan(account_id: str) -> dict[str, Any]:
    from . import db

    draft = db.get_plan_by_status(account_id, "draft")
    if not draft:
        return {"error": "Kein Entwurf zum Bestaetigen vorhanden"}
    db.archive_plans(account_id, ("active",))
    db.update_plan(account_id, draft["id"], status="active")
    return {"status": "ok", "plan_id": draft["id"], "active": True}


# ---------------------------------------------------------------------------
# Web search (keyless, via ddgs / DuckDuckGo). account_id is unused but kept
# for the uniform dispatch signature.
# ---------------------------------------------------------------------------


def web_search(account_id: str, query: str, count: int = 5) -> dict[str, Any]:  # noqa: ARG001
    from ddgs import DDGS

    n = max(1, min(count, 10))
    try:
        with DDGS() as ddgs:
            hits = list(ddgs.text(query, max_results=n))
    except Exception as exc:
        return {"error": f"web search failed: {exc}"}

    results = [
        {"title": h.get("title"), "url": h.get("href"), "snippet": h.get("body")}
        for h in hits
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
    "get_current_plan": get_current_plan,
    "update_plan": update_plan,
    "confirm_plan": confirm_plan,
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
            "name": "get_weekly_load",
            "description": (
                "Compare this week vs last week: total sessions, total minutes and km, "
                "breakdown per sport, intensity split. Use for load and trend questions."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the public web for current info you do not already know: "
                "race events + dates, registration, training methodology, news. "
                "Returns title + url + snippet for the top results."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query."},
                    "count": {"type": "integer", "description": "Results 1-10 (default 5)."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_plan",
            "description": (
                "Read the current training plan (draft or active) so you can discuss "
                "or edit it with the user. Returns weeks/days/sessions + rationale."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_plan",
            "description": (
                "Apply the user's requested changes to the plan. You pass the FULL "
                "updated weeks array (read it first with get_current_plan, modify what "
                "the user wants, pass the whole thing back). Use for tweaks like moving "
                "a session, retargeting a step, swapping a sport. Each session uses the "
                "universal grammar (sport/intent/headline/groups->steps); keep it valid."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "weeks": {"type": "array", "items": WEEK_SCHEMA},
                    "rationale": {
                        "type": "string",
                        "description": "Optional updated rationale.",
                    },
                },
                "required": ["weeks"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "confirm_plan",
            "description": (
                "Confirm the draft plan as the user's active plan once they are happy "
                "with it. Archives any previous active plan. Call only after the user "
                "explicitly approves."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


# No provider server tools anymore: web_search is a normal function tool
# (keyless, via ddgs) so it round-trips cleanly in multi-turn sub-agent loops.
SERVER_TOOL_NAMES: set[str] = set()


def schemas_for(names: set[str]) -> list[dict[str, Any]]:
    """Subset of TOOL_SCHEMAS by tool name (for sub-agent tool sets)."""
    return [t for t in TOOL_SCHEMAS if t["function"]["name"] in names]


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
