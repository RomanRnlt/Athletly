"""Deterministic validator for the universal-session-grammar training plan.

Self-contained (no app imports) so it travels with the plan skill per the Agent
Skills standard and can also be run standalone: `python3 validate_plan.py plan.json`.

Two entry points:
  coerce(plan)   -> repair model serialization slips (e.g. weeks emitted as a
                    JSON string instead of an array). Returns a new plan dict.
  validate(plan) -> list[str] of grammar violations ([] = clean). The structural
                    safety net the strict JSON schema cannot fully express
                    (exact 2x7 shape, depth-1, amount/kind coherence, pace not
                    encoded as a numeric range).
"""

from __future__ import annotations

import json
from typing import Any

INTENTS = {
    "recovery", "aerobic_base", "tempo", "threshold",
    "vo2max", "strength", "skill", "competition",
}
MODES = {"fixed", "for_time", "amrap", "emom"}
ROLES = {"warmup", "work", "recovery", "rest", "cooldown"}
TARGET_KINDS = {"time", "distance", "reps", "open"}
PRESCRIPTION_KINDS = {"pace", "hr", "power", "rpe", "load", "none"}


def _maybe_json(value: Any) -> Any:
    """If value is a JSON string encoding a list/dict, decode it; else as-is."""
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    if not stripped or stripped[0] not in "[{":
        return value
    try:
        return json.loads(stripped)
    except (ValueError, TypeError):
        return value


def coerce(plan: Any) -> dict[str, Any]:
    """Repair common model serialization slips so a valid plan is not lost to a
    stringified array. Idempotent; returns a new dict."""
    plan = _maybe_json(plan)
    if not isinstance(plan, dict):
        return {"rationale": "", "weeks": []}

    weeks = _maybe_json(plan.get("weeks"))
    if not isinstance(weeks, list):
        weeks = []

    fixed_weeks = []
    for week in weeks:
        week = _maybe_json(week)
        if not isinstance(week, dict):
            continue
        days = _maybe_json(week.get("days"))
        if not isinstance(days, list):
            days = []
        fixed_days = []
        for day in days:
            day = _maybe_json(day)
            if not isinstance(day, dict):
                continue
            sessions = _maybe_json(day.get("sessions"))
            if not isinstance(sessions, list):
                sessions = []
            fixed_sessions = []
            for session in sessions:
                session = _maybe_json(session)
                if not isinstance(session, dict):
                    continue
                groups = _maybe_json(session.get("groups"))
                if not isinstance(groups, list):
                    groups = []
                fixed_groups = []
                for group in groups:
                    group = _maybe_json(group)
                    if not isinstance(group, dict):
                        continue
                    steps = _maybe_json(group.get("steps"))
                    if isinstance(steps, list):
                        group = {**group, "steps": [_maybe_json(s) for s in steps]}
                    fixed_groups.append(group)
                fixed_sessions.append({**session, "groups": fixed_groups})
            fixed_days.append({**day, "sessions": fixed_sessions})
        fixed_weeks.append({**week, "days": fixed_days})

    return {**plan, "weeks": fixed_weeks}


def _validate_session(session: dict[str, Any], where: str) -> list[str]:
    errs: list[str] = []
    if session.get("intent") not in INTENTS:
        errs.append(f"{where}: invalid intent {session.get('intent')!r}")
    if not str(session.get("sport", "")).strip():
        errs.append(f"{where}: empty sport")
    for gi, group in enumerate(session.get("groups", [])):
        if not isinstance(group, dict):
            errs.append(f"{where} group[{gi}]: not an object")
            continue
        if group.get("mode") not in MODES:
            errs.append(f"{where} group[{gi}]: invalid mode {group.get('mode')!r}")
        for si, step in enumerate(group.get("steps", [])):
            sw = f"{where} g{gi}.s{si}"
            if not isinstance(step, dict):
                errs.append(f"{sw}: not an object")
                continue
            if "steps" in step or "mode" in step:
                errs.append(f"{sw}: nested group (depth-1 violation)")
            if step.get("role") not in ROLES:
                errs.append(f"{sw}: invalid role {step.get('role')!r}")
            target = step.get("target") or {}
            kind = target.get("kind")
            if kind not in TARGET_KINDS:
                errs.append(f"{sw}: invalid target kind {kind!r}")
            elif kind == "open" and target.get("amount") is not None:
                errs.append(f"{sw}: 'open' target must not carry an amount")
            elif kind != "open" and not isinstance(target.get("amount"), (int, float)):
                errs.append(f"{sw}: '{kind}' target needs a numeric amount")
            presc = step.get("prescription")
            if presc is not None:
                if not isinstance(presc, dict) or presc.get("kind") not in PRESCRIPTION_KINDS:
                    errs.append(f"{sw}: invalid prescription")
                elif presc.get("kind") == "pace" and presc.get("value") is None and presc.get("rng"):
                    # pace as a numeric range renders as raw seconds; require a string value.
                    errs.append(f"{sw}: pace should use a string value (e.g. '5:50/km'), not a numeric range")
    return errs


def validate(plan: Any) -> list[str]:
    """Return a list of grammar violations; empty list means the plan is valid."""
    errs: list[str] = []
    if not isinstance(plan, dict):
        return ["plan is not an object"]
    if not isinstance(plan.get("rationale"), str) or not plan["rationale"].strip():
        errs.append("missing or empty rationale")
    weeks = plan.get("weeks")
    if not isinstance(weeks, list):
        return errs + ["weeks is not a list"]
    if len(weeks) != 2:
        errs.append(f"expected exactly 2 weeks, got {len(weeks)}")
    for wi, week in enumerate(weeks):
        if not isinstance(week, dict):
            errs.append(f"week[{wi}]: not an object")
            continue
        if not str(week.get("week_start", "")).strip():
            errs.append(f"week[{wi}]: missing week_start")
        days = week.get("days")
        if not isinstance(days, list):
            errs.append(f"week[{wi}]: days is not a list")
            continue
        if len(days) != 7:
            errs.append(f"week[{wi}]: expected 7 days, got {len(days)}")
        for day in days:
            if not isinstance(day, dict):
                errs.append(f"week[{wi}]: a day is not an object")
                continue
            date = day.get("date", "?")
            for si, session in enumerate(day.get("sessions", []) or []):
                if not isinstance(session, dict):
                    errs.append(f"w{wi} {date} s{si}: not an object")
                    continue
                errs.extend(_validate_session(session, f"w{wi} {date} s{si}"))
    return errs


if __name__ == "__main__":
    import sys

    raw = sys.stdin.read() if len(sys.argv) < 2 else open(sys.argv[1]).read()
    data = coerce(json.loads(raw))
    problems = validate(data)
    if problems:
        print(f"INVALID ({len(problems)} issues):")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print("VALID - grammar clean")
