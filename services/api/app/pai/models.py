# SPDX-License-Identifier: MIT
"""Typed agent outputs for the pydantic-ai migration.

Design: type only the STRUCTURE we enforce; pass CONTENT through raw.

The previous engine passed the model's plan JSON through untyped, and the eval
harness validates the session grammar itself (e.g. a step's ``target`` is a
structured object ``{"kind": "time", "amount": ...}``). So we type only the
outer shape we want to guarantee, a plan has exactly 2 weeks, a week exactly 7
days, and leave each day's ``sessions`` as raw dicts so the model's grammar
(sessions -> groups -> steps -> structured target) reaches the eval and the UI
exactly as produced. Typing the inner grammar (e.g. ``target: str``) corrupted
it and crashed the grammar checker.

The 2-week / 7-day rules COERCE rather than reject (trim extras, pad short), so
a plan always submits with valid structure instead of burning output retries the
model cannot satisfy.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DAYS_PER_WEEK = 7
WEEKS_PER_PLAN = 2


class _Lenient(BaseModel):
    """Accept (and keep) extra keys the model may add."""

    model_config = ConfigDict(extra="allow")


class Day(_Lenient):
    date: str = ""
    # Raw, untyped: the model's full session grammar passes through unchanged.
    sessions: list[dict[str, Any]] = Field(default_factory=list)
    rest_reason: str = ""


class Week(_Lenient):
    week_start: str = ""
    coach_message: str = ""
    days: list[Day] = Field(default_factory=list)

    @field_validator("days")
    @classmethod
    def normalize_to_seven_days(cls, v: list[Day]) -> list[Day]:
        """Coerce, don't reject: the model tends to produce 8-day weeks (the bug
        the baseline exposed). Trim/pad to exactly 7 deterministically."""
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
        """Coerce to exactly 2 weeks (trim extras; pad with empty 7-day weeks)."""
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
