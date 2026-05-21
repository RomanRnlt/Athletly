"""Plan-vs-actual matching.

Pure, immutable, no I/O. Given the plan weeks (universal grammar) and the
athlete's real activities, decide per planned session whether it was done and
per day a completion ratio. The match is deliberately coarse: same date + same
sport family. A day's completion drives the WeekStrip ring; a session's `done`
flag drives a per-session marker. Intensity/duration are NOT matched (a v1
"did something of this kind happen that day" signal, not a strict adherence
score).
"""

from __future__ import annotations

from typing import Any

# Coarse sport families: a planned session counts as done when an activity of
# the same family happened on its date. Keys cover the Garmin sport keys we see;
# unknown sports fall back to the raw key (exact match still works).
_SPORT_FAMILY: dict[str, str] = {
    "running": "run",
    "trail_running": "run",
    "treadmill_running": "run",
    "track_running": "run",
    "indoor_running": "run",
    "cycling": "ride",
    "road_biking": "ride",
    "mountain_biking": "ride",
    "gravel_cycling": "ride",
    "indoor_cycling": "ride",
    "virtual_ride": "ride",
    "swimming": "swim",
    "lap_swimming": "swim",
    "open_water_swimming": "swim",
    "gym": "strength",
    "strength": "strength",
    "strength_training": "strength",
    "yoga": "mobility",
    "pilates": "mobility",
    "hiking": "hike",
    "walking": "walk",
}


def sport_family(sport: str | None) -> str:
    s = (sport or "").strip().lower()
    return _SPORT_FAMILY.get(s, s)


def _activity_date(activity: dict[str, Any]) -> str:
    return str(activity.get("start_time") or "")[:10]


def enrich_weeks_with_progress(
    weeks: list[dict[str, Any]],
    activities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return new weeks where each session has a ``done`` bool and each day a
    ``completion`` (0..1, or None for rest days). Each activity matches at most
    one planned session (greedy, per date + sport family)."""
    by_date: dict[str, list[str]] = {}
    for activity in activities:
        date = _activity_date(activity)
        if date:
            by_date.setdefault(date, []).append(sport_family(activity.get("sport")))

    out_weeks: list[dict[str, Any]] = []
    for week in weeks:
        out_days: list[dict[str, Any]] = []
        for day in week.get("days", []) or []:
            date = day.get("date")
            sessions = day.get("sessions") or []
            available = list(by_date.get(date, []))  # consumed as we match
            out_sessions: list[dict[str, Any]] = []
            matched = 0
            for session in sessions:
                family = sport_family(session.get("sport"))
                done = family in available
                if done:
                    available.remove(family)
                    matched += 1
                out_sessions.append({**session, "done": done})
            completion = (matched / len(sessions)) if sessions else None
            out_days.append({**day, "sessions": out_sessions, "completion": completion})
        out_weeks.append({**week, "days": out_days})
    return out_weeks


def plan_date_range(weeks: list[dict[str, Any]]) -> tuple[str, str] | None:
    """Min/max ISO day date across the plan, or None if there are no dates."""
    dates = [
        d.get("date")
        for week in weeks
        for d in (week.get("days") or [])
        if isinstance(d.get("date"), str) and d.get("date")
    ]
    if not dates:
        return None
    return min(dates), max(dates)
