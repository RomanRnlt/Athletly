"""Deterministic invariant checks for a generated plan.

Each invariant is a small dict with a closed ``kind`` and a few well-defined
parameters. ``check_invariant`` dispatches on ``kind`` and returns
``(passed, detail)``. Detail is a single-line human-readable explanation,
used for the eval report.

We deliberately keep the assertions COARSE: this layer is the safety net for
gross structural mistakes (no rest days, hidden runs back-to-back, plan
prescribes intervals despite a deload context). Fine quality judgement stays
with the LLM judge in ``judge.py``.
"""

from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Any

from ..plan_progress import sport_family


# ---------------------------------------------------------------------------
# Plan walkers
# ---------------------------------------------------------------------------


def _weeks(plan: dict[str, Any]) -> list[dict[str, Any]]:
    return list(plan.get("weeks") or [])


def _days(week: dict[str, Any]) -> list[dict[str, Any]]:
    return list(week.get("days") or [])


def _sessions(day: dict[str, Any]) -> list[dict[str, Any]]:
    return list(day.get("sessions") or [])


def _all_sessions(plan: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for week in _weeks(plan):
        for day in _days(week):
            out.extend(_sessions(day))
    return out


def _week_one_sessions(plan: dict[str, Any]) -> list[dict[str, Any]]:
    weeks = _weeks(plan)
    if not weeks:
        return []
    return [
        session
        for day in _days(weeks[0])
        for session in _sessions(day)
    ]


def _session_minutes(session: dict[str, Any]) -> int:
    """Sum target seconds of work/warmup/cooldown/recovery steps across all
    groups (excluding rest steps). Approximates session duration in minutes.

    For ``mode='fixed'`` with N rounds, every step is multiplied by N (matches
    how the universal grammar represents repeated blocks). For functional modes
    (for_time/amrap/emom) we cap at ``cap_s`` when present.
    """
    total_seconds = 0
    for group in session.get("groups") or []:
        mode = group.get("mode") or "fixed"
        if mode in ("for_time", "amrap", "emom") and group.get("cap_s"):
            try:
                total_seconds += int(group["cap_s"])
                continue
            except (TypeError, ValueError):
                pass
        rounds = group.get("rounds") or 1
        try:
            rounds = max(1, int(rounds))
        except (TypeError, ValueError):
            rounds = 1
        block_seconds = 0
        for step in group.get("steps") or []:
            role = step.get("role")
            if role == "rest":
                # Inter-set rests can dominate the apparent duration; keep them
                # out of "session length" so a long microrest doesn't look like
                # a 90-min session.
                continue
            target = step.get("target") or {}
            if target.get("kind") == "time":
                amount = target.get("amount")
                if isinstance(amount, (int, float)):
                    block_seconds += int(amount)
        total_seconds += block_seconds * rounds
    return round(total_seconds / 60)


def _running_distance_meters(session: dict[str, Any]) -> int:
    """Sum running-distance meters across all groups (rounded)."""
    if sport_family(session.get("sport")) != "run":
        return 0
    total = 0
    for group in session.get("groups") or []:
        try:
            rounds = max(1, int(group.get("rounds") or 1))
        except (TypeError, ValueError):
            rounds = 1
        block = 0
        for step in group.get("steps") or []:
            if step.get("role") == "rest":
                continue
            target = step.get("target") or {}
            if target.get("kind") == "distance":
                amount = target.get("amount")
                if isinstance(amount, (int, float)):
                    block += int(amount)
        total += block * rounds
    return total


def _running_minutes(session: dict[str, Any]) -> int:
    """When a run is timed (not distance-based), approximate volume by minutes."""
    if sport_family(session.get("sport")) != "run":
        return 0
    return _session_minutes(session)


# ---------------------------------------------------------------------------
# Individual invariant checks
# ---------------------------------------------------------------------------


def _check_max_session_duration(plan: dict[str, Any], limit_min: int) -> tuple[bool, str]:
    bad: list[str] = []
    for session in _all_sessions(plan):
        mins = _session_minutes(session)
        if mins > limit_min:
            bad.append(f"{session.get('date')} {session.get('sport')}={mins}min")
    if bad:
        return False, f"max_session_duration({limit_min}) violated: {', '.join(bad[:3])}"
    return True, f"max_session_duration({limit_min}) ok"


def _check_min_rest_days_per_week(plan: dict[str, Any], min_rest: int) -> tuple[bool, str]:
    bad: list[str] = []
    for wi, week in enumerate(_weeks(plan)):
        rest_count = sum(1 for day in _days(week) if not _sessions(day))
        if rest_count < min_rest:
            bad.append(f"week{wi + 1}={rest_count}")
    if bad:
        return False, f"min_rest_days_per_week({min_rest}) violated: {', '.join(bad)}"
    return True, f"min_rest_days_per_week({min_rest}) ok"


def _check_max_training_days_per_week(plan: dict[str, Any], max_train: int) -> tuple[bool, str]:
    bad: list[str] = []
    for wi, week in enumerate(_weeks(plan)):
        training_days = sum(1 for day in _days(week) if _sessions(day))
        if training_days > max_train:
            bad.append(f"week{wi + 1}={training_days}")
    if bad:
        return False, f"max_training_days_per_week({max_train}) violated: {', '.join(bad)}"
    return True, f"max_training_days_per_week({max_train}) ok"


def _recent_week_volume(
    activities: list[dict[str, Any]],
    sport_filter: str,
) -> tuple[int, int]:
    """Return (running_meters, running_minutes) for the most-recent 7 days of
    activities matching ``sport_filter`` (sport family)."""
    if not activities:
        return 0, 0
    family = sport_filter.lower()
    # The fixture stores start_time as ISO; the most-recent date wins.
    dates = [str(a.get("start_time") or "")[:10] for a in activities if a.get("start_time")]
    dates = [d for d in dates if d]
    if not dates:
        return 0, 0
    latest = max(dates)
    latest_date = date.fromisoformat(latest)
    meters = 0
    minutes = 0
    for activity in activities:
        d_str = str(activity.get("start_time") or "")[:10]
        if not d_str:
            continue
        d = date.fromisoformat(d_str)
        if (latest_date - d).days >= 7:
            continue
        if sport_family(activity.get("sport")) != family:
            continue
        meters += int(activity.get("distance_meters") or 0)
        minutes += round(int(activity.get("duration_seconds") or 0) / 60)
    return meters, minutes


def _check_max_volume_jump(
    plan: dict[str, Any],
    *,
    sport: str,
    activities: list[dict[str, Any]],
    pct: int,
) -> tuple[bool, str]:
    """Compare plan week-1 volume vs the recent 7d window from activities,
    in the same sport family."""
    family = sport_family(sport)
    weeks = _weeks(plan)
    if not weeks:
        return False, "no weeks"
    week_one = weeks[0]
    plan_meters = 0
    plan_minutes = 0
    for day in _days(week_one):
        for session in _sessions(day):
            if sport_family(session.get("sport")) != family:
                continue
            plan_meters += _running_distance_meters(session)
            plan_minutes += _session_minutes(session)
    recent_meters, recent_minutes = _recent_week_volume(activities, family)

    # Prefer distance comparison when we have meters on both sides; otherwise
    # fall back to minutes. If recent is zero (e.g. injured/cold start), any
    # plan volume passes - we only catch "jumped TOO MUCH", not "too low".
    if recent_meters > 0 and plan_meters > 0:
        ratio = plan_meters / recent_meters
        max_ratio = 1 + (pct / 100)
        ok = ratio <= max_ratio
        return ok, (
            f"max_volume_jump_pct({family}, {pct}%): plan {plan_meters / 1000:.1f}km "
            f"vs recent {recent_meters / 1000:.1f}km -> {ratio * 100:.0f}% "
            f"(limit {max_ratio * 100:.0f}%)"
        )
    if recent_minutes > 0 and plan_minutes > 0:
        ratio = plan_minutes / recent_minutes
        max_ratio = 1 + (pct / 100)
        ok = ratio <= max_ratio
        return ok, (
            f"max_volume_jump_pct({family}, {pct}%): plan {plan_minutes}min "
            f"vs recent {recent_minutes}min -> {ratio * 100:.0f}% "
            f"(limit {max_ratio * 100:.0f}%)"
        )
    return True, (
        f"max_volume_jump_pct({family}, {pct}%) skipped: no comparable recent volume"
    )


def _check_required_sports_present(
    plan: dict[str, Any],
    required: list[str],
) -> tuple[bool, str]:
    seen_families = {sport_family(s.get("sport")) for s in _all_sessions(plan)}
    missing = [r for r in required if sport_family(r) not in seen_families]
    if missing:
        return False, f"required_sports_present missing: {', '.join(missing)}"
    return True, f"required_sports_present ok ({', '.join(required)})"


def _check_required_intent_dominant(
    plan: dict[str, Any],
    intents: list[str],
    min_fraction: float = 0.6,
) -> tuple[bool, str]:
    sessions = _week_one_sessions(plan)
    if not sessions:
        return False, "required_intent_dominant: no sessions in week 1"
    allowed = set(intents)
    hits = sum(1 for s in sessions if s.get("intent") in allowed)
    fraction = hits / len(sessions)
    ok = fraction >= min_fraction
    return ok, (
        f"required_intent_dominant({sorted(allowed)}): "
        f"{hits}/{len(sessions)} in week 1 = {fraction * 100:.0f}% "
        f"(need >= {min_fraction * 100:.0f}%)"
    )


def _check_forbidden_intent(plan: dict[str, Any], intents: list[str]) -> tuple[bool, str]:
    forbidden = set(intents)
    violations: list[str] = []
    for session in _all_sessions(plan):
        if session.get("intent") in forbidden:
            violations.append(f"{session.get('date')}={session.get('intent')}")
    if violations:
        return False, f"forbidden_intent({sorted(forbidden)}) violated: {', '.join(violations[:3])}"
    return True, f"forbidden_intent({sorted(forbidden)}) ok"


def _check_required_session_kind(
    plan: dict[str, Any],
    kind_filter: str,
) -> tuple[bool, str]:
    if kind_filter != "functional":
        return False, f"required_session_kind: unsupported filter {kind_filter!r}"
    for session in _all_sessions(plan):
        for group in session.get("groups") or []:
            if (group.get("mode") or "") in ("for_time", "amrap", "emom"):
                return True, "required_session_kind(functional) ok"
    return False, "required_session_kind(functional) violated: no for_time/amrap/emom group"


_HARD_RUN_INTENTS = {"threshold", "vo2max", "tempo"}


def _check_no_consecutive_hard_runs(plan: dict[str, Any]) -> tuple[bool, str]:
    by_date: dict[str, bool] = {}
    for week in _weeks(plan):
        for day in _days(week):
            d = day.get("date")
            if not isinstance(d, str):
                continue
            hard = any(
                sport_family(s.get("sport")) == "run"
                and (s.get("intent") in _HARD_RUN_INTENTS)
                for s in _sessions(day)
            )
            by_date[d] = hard
    sorted_dates = sorted(by_date.keys())
    for i in range(1, len(sorted_dates)):
        prev_d = date.fromisoformat(sorted_dates[i - 1])
        curr_d = date.fromisoformat(sorted_dates[i])
        if (curr_d - prev_d).days != 1:
            continue
        if by_date[sorted_dates[i - 1]] and by_date[sorted_dates[i]]:
            return False, (
                f"no_consecutive_hard_runs violated: "
                f"{sorted_dates[i - 1]} + {sorted_dates[i]}"
            )
    return True, "no_consecutive_hard_runs ok"


def _check_sport_family_only(
    plan: dict[str, Any],
    families: list[str],
) -> tuple[bool, str]:
    allowed = {f.lower() for f in families}
    bad: list[str] = []
    for session in _all_sessions(plan):
        fam = sport_family(session.get("sport"))
        if fam not in allowed:
            bad.append(f"{session.get('date')}={session.get('sport')}->{fam}")
    if bad:
        return False, f"sport_family_only({sorted(allowed)}) violated: {', '.join(bad[:3])}"
    return True, f"sport_family_only({sorted(allowed)}) ok"


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------


def check_invariant(
    invariant: dict[str, Any],
    plan: dict[str, Any],
    fixture_activities: list[dict[str, Any]],
) -> tuple[bool, str]:
    """Run one invariant against the plan. Returns (passed, detail)."""
    kind = invariant.get("kind")
    if kind == "max_session_duration_min":
        return _check_max_session_duration(plan, int(invariant.get("value", 60)))
    if kind == "min_rest_days_per_week":
        return _check_min_rest_days_per_week(plan, int(invariant.get("value", 1)))
    if kind == "max_training_days_per_week":
        return _check_max_training_days_per_week(plan, int(invariant.get("value", 7)))
    if kind == "max_volume_jump_pct":
        return _check_max_volume_jump(
            plan,
            sport=str(invariant.get("sport", "running")),
            activities=fixture_activities,
            pct=int(invariant.get("value", 20)),
        )
    if kind == "required_sports_present":
        return _check_required_sports_present(plan, list(invariant.get("sports", [])))
    if kind == "required_intent_dominant":
        return _check_required_intent_dominant(plan, list(invariant.get("intents", [])))
    if kind == "forbidden_intent":
        return _check_forbidden_intent(plan, list(invariant.get("intents", [])))
    if kind == "required_session_kind":
        return _check_required_session_kind(plan, str(invariant.get("kind_filter", "")))
    if kind == "no_consecutive_hard_runs":
        return _check_no_consecutive_hard_runs(plan)
    if kind == "sport_family_only":
        return _check_sport_family_only(plan, list(invariant.get("families", [])))
    return False, f"unknown invariant kind: {kind!r}"


def check_all(
    invariants: list[dict[str, Any]],
    plan: dict[str, Any],
    fixture_activities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Run every invariant; return a list of result dicts the report uses."""
    out: list[dict[str, Any]] = []
    for inv in invariants:
        passed, detail = check_invariant(inv, plan, fixture_activities)
        out.append({"invariant": inv, "passed": passed, "detail": detail})
    return out


def summarize_intents(plan: dict[str, Any]) -> dict[str, int]:
    """Diagnostic helper for the report: count session intents across the plan."""
    return dict(Counter(s.get("intent") for s in _all_sessions(plan)))
