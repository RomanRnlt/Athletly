# SPDX-License-Identifier: MIT
"""Typed agent outputs for the pydantic-ai migration.

Design: STRICT on structure, LENIENT on content.

The structural invariants are the bugs the eval baseline exposed and the ones
worth enforcing by construction: a plan has exactly 2 weeks, a week has exactly
7 days. These raise on violation, so pydantic-ai retries the model (with a clear
message) instead of shipping an 8-day week.

Everything below the day level (sessions, groups, steps) is intentionally
lenient (optional fields, free-string enums, extra allowed): the previous engine
passed the model's session grammar through untyped, so over-strict inner typing
would reject otherwise-fine plans and burn retries. Quality of the content is
judged by the evaluator agent + the eval harness, not by rejecting it here.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DAYS_PER_WEEK = 7
WEEKS_PER_PLAN = 2

# Kept for reference / sync test; the models use free strings for leniency.
SESSION_INTENTS = [
    "recovery", "aerobic_base", "tempo", "threshold", "vo2max",
    "strength", "skill", "competition",
]
GROUP_MODES = ["fixed", "for_time", "amrap", "emom"]
STEP_ROLES = ["warmup", "work", "recovery", "rest", "cooldown"]


class _Lenient(BaseModel):
    """Base for content models: accept extra keys the model may add."""

    model_config = ConfigDict(extra="allow")


class Step(_Lenient):
    role: str = ""
    target: str = ""
    prescription: str = ""
    movement: str = ""
    note: str = ""


class Group(_Lenient):
    mode: str = ""
    label: str = ""
    rounds: int | None = None
    cap_s: int | None = None
    interval_s: int | None = None
    steps: list[Step] = Field(default_factory=list)


class Session(_Lenient):
    date: str = ""
    sport: str = ""
    intent: str = ""
    headline: str = ""
    load: float | None = None
    status: str = "planned"
    groups: list[Group] = Field(default_factory=list)


class Day(_Lenient):
    date: str = ""
    sessions: list[Session] = Field(default_factory=list)
    rest_reason: str = ""


class Week(_Lenient):
    week_start: str = ""
    coach_message: str = ""
    days: list[Day] = Field(default_factory=list)

    @field_validator("days")
    @classmethod
    def normalize_to_seven_days(cls, v: list[Day]) -> list[Day]:
        """Coerce, don't reject: the model tends to produce 8-day weeks (the bug
        the baseline exposed). Trimming/padding to exactly 7 guarantees a valid
        week deterministically, instead of burning expensive output retries the
        model fails to satisfy."""
        if len(v) > DAYS_PER_WEEK:
            return v[:DAYS_PER_WEEK]
        while len(v) < DAYS_PER_WEEK:
            v = [*v, Day(rest_reason="rest")]
        return v


class TrainingPlan(_Lenient):
    rationale: str = ""
    weeks: list[Week]

    @field_validator("weeks")
    @classmethod
    def normalize_to_two_weeks(cls, v: list[Week]) -> list[Week]:
        """Coerce to exactly 2 weeks (trim extras; pad with empty weeks)."""
        if len(v) > WEEKS_PER_PLAN:
            return v[:WEEKS_PER_PLAN]
        while 0 < len(v) < WEEKS_PER_PLAN:
            v = [*v, Week(days=[Day(rest_reason="rest") for _ in range(DAYS_PER_WEEK)])]
        return v


# ---------------------------------------------------------------------------
# Evaluator output. Binding approval is computed from the blocking count.
# ---------------------------------------------------------------------------


class Issue(_Lenient):
    severity: Literal["blocking", "minor"] = "minor"
    text: str = ""


class EvaluationResult(_Lenient):
    summary: str = ""
    issues: list[Issue] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    score: int = 0
    approved: bool = False

    @property
    def blocking_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "blocking")

    def binding_approved(self) -> bool:
        return self.blocking_count == 0
