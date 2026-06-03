# SPDX-License-Identifier: MIT
"""Typed agent outputs for the pydantic-ai migration.

These mirror the hand-written JSON Schemas in ``tools.py`` (PLAN_SCHEMA /
EVALUATION_SCHEMA) but as Pydantic models, so they become the ``output_type`` of
the pydantic-ai agents. Crucially, structural invariants are validated here:
a week MUST have exactly 7 days, a plan exactly 2 weeks. When the model returns
a violation (e.g. the 8-day weeks the eval baseline exposed), Pydantic raises a
ValidationError, which pydantic-ai turns into a ``ModelRetry`` automatically, so
the agent corrects itself instead of shipping a broken plan.

Enum values are kept in sync with ``tools.SESSION_INTENTS`` / ``GROUP_MODES`` /
``STEP_ROLES`` (see the tests).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Mirror of tools.py enums (kept in sync by a test).
SessionIntent = Literal[
    "recovery", "aerobic_base", "tempo", "threshold", "vo2max",
    "strength", "skill", "competition",
]
GroupMode = Literal["fixed", "for_time", "amrap", "emom"]
StepRole = Literal["warmup", "work", "recovery", "rest", "cooldown"]

DAYS_PER_WEEK = 7
WEEKS_PER_PLAN = 2


class Step(BaseModel):
    role: StepRole
    target: str
    prescription: str
    movement: str
    note: str = ""


class Group(BaseModel):
    mode: GroupMode
    label: str = ""
    rounds: int | None = None
    cap_s: int | None = None
    interval_s: int | None = None
    steps: list[Step] = Field(default_factory=list)


class Session(BaseModel):
    date: str  # ISO YYYY-MM-DD
    sport: str
    intent: SessionIntent
    headline: str
    load: float | None = None
    status: str = "planned"
    groups: list[Group] = Field(default_factory=list)


class Day(BaseModel):
    date: str  # ISO YYYY-MM-DD
    sessions: list[Session] = Field(default_factory=list)
    rest_reason: str = ""


class Week(BaseModel):
    week_start: str  # Monday, ISO date
    coach_message: str = ""
    days: list[Day]

    @field_validator("days")
    @classmethod
    def exactly_seven_days(cls, v: list[Day]) -> list[Day]:
        if len(v) != DAYS_PER_WEEK:
            raise ValueError(
                f"a week must have exactly {DAYS_PER_WEEK} days (Mon-Sun), got {len(v)}"
            )
        return v


class TrainingPlan(BaseModel):
    rationale: str
    weeks: list[Week]

    @field_validator("weeks")
    @classmethod
    def exactly_two_weeks(cls, v: list[Week]) -> list[Week]:
        if len(v) != WEEKS_PER_PLAN:
            raise ValueError(
                f"a plan must have exactly {WEEKS_PER_PLAN} weeks, got {len(v)}"
            )
        return v


# ---------------------------------------------------------------------------
# Evaluator output. Approval is computed by the system from the blocking count
# (see agents._derive_binding_approval), NOT from the model's own `approved`
# field; that stays advisory here.
# ---------------------------------------------------------------------------


class Issue(BaseModel):
    severity: Literal["blocking", "minor"]
    text: str


class EvaluationResult(BaseModel):
    summary: str
    issues: list[Issue] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    score: int = 0
    approved: bool = False

    @property
    def blocking_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "blocking")

    def binding_approved(self) -> bool:
        """Deterministic approval: passes iff there are no blocking issues."""
        return self.blocking_count == 0
