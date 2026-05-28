"""LLM-as-judge for qualitative plan scoring.

Six axes, each 0-10, summed and normalised to a 0-100 ``overall`` score.
Output is forced into a strict JSON shape via a litellm tool-call: we declare
a single ``submit_score`` tool with the exact schema and pin
``tool_choice='required'`` so the model cannot reply in prose.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import litellm

from ..config import settings
from .fixtures import Fixture


logger = logging.getLogger(__name__)


AXES: tuple[str, ...] = (
    "goal_alignment",
    "load_progression",
    "recovery_adequacy",
    "constraint_adherence",
    "specificity",
    "science_grounding",
)

AXIS_DESCRIPTIONS: dict[str, str] = {
    "goal_alignment": "Plan directly serves the athlete's stated goal and timeline.",
    "load_progression": "Volume/intensity build is sane, no dangerous jumps, absorption built in.",
    "recovery_adequacy": "Enough easy + full rest days, hard sessions spaced, recovery signals respected.",
    "constraint_adherence": "Available days, time caps, non-negotiables and preferences are honoured.",
    "specificity": "Concrete targets (pace/load/reps/time), real movements, no generic 'cardio'.",
    "science_grounding": "Periodisation + session design reflect current evidence for this athlete's goal.",
}


_SCORE_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "submit_score",
        "description": "Submit the structured qualitative score for the plan.",
        "parameters": {
            "type": "object",
            "properties": {
                "axes": {
                    "type": "object",
                    "description": "Each axis scored 0-10 (integers).",
                    "properties": {
                        axis: {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 10,
                            "description": AXIS_DESCRIPTIONS[axis],
                        }
                        for axis in AXES
                    },
                    "required": list(AXES),
                },
                "rationale": {
                    "type": "string",
                    "description": "Short paragraph explaining the scores; one line per axis is ideal.",
                },
            },
            "required": ["axes", "rationale"],
        },
    },
}


def _default_model() -> str:
    """Judge model: env override > plan_model. Same provider stack as agents."""
    return os.getenv("ATHLETLY_EVAL_JUDGE_MODEL") or settings.plan_model


def _system_prompt() -> str:
    bullets = "\n".join(f"- {axis}: {AXIS_DESCRIPTIONS[axis]}" for axis in AXES)
    return (
        "You are an experienced sports scientist scoring a 2-week training plan "
        "produced by a coaching agent. Be strict, evidence-based, and concise.\n\n"
        "Score the plan on these six axes, integers 0-10:\n"
        f"{bullets}\n\n"
        "0 means 'unacceptable for this athlete'. 5 means 'acceptable but flawed'. "
        "10 means 'genuinely excellent for this athlete'. Reserve 9-10 for plans "
        "that would impress a senior coach. Output ONLY via the submit_score tool."
    )


def _user_prompt(plan: dict[str, Any], fixture: Fixture) -> str:
    profile_blocks: list[str] = []
    for name, content in fixture.profile_sections.items():
        body = content.strip()
        if body:
            profile_blocks.append(f"## {name}\n{body}")
    profile_text = "\n\n".join(profile_blocks) or "(profile empty)"

    notes = f"Notes: {fixture.notes}\n" if fixture.notes else ""
    plan_json = json.dumps(plan, ensure_ascii=False, default=str)

    return (
        f"# Fixture\n{fixture.description}\n{notes}\n"
        f"# Athlete Profile\n{profile_text}\n\n"
        f"# Plan to score (JSON)\n```json\n{plan_json}\n```\n\n"
        "Score every axis 0-10 and submit via submit_score. Be honest; this is "
        "feeding a regression dashboard, not the athlete directly."
    )


def _parse_tool_args(message: Any) -> dict[str, Any] | None:
    tool_calls = getattr(message, "tool_calls", None) or []
    for tc in tool_calls:
        if tc.function.name != "submit_score":
            continue
        try:
            return json.loads(tc.function.arguments or "{}")
        except json.JSONDecodeError:
            return None
    return None


def _overall(axes: dict[str, int]) -> int:
    total = 0
    for axis in AXES:
        try:
            total += max(0, min(10, int(axes.get(axis, 0))))
        except (TypeError, ValueError):
            continue
    # 60 = 6 axes * 10
    return round((total / 60) * 100)


async def score_plan(
    plan: dict[str, Any],
    fixture: Fixture,
    model: str | None = None,
) -> dict[str, Any]:
    """Run the LLM judge against one plan. Returns ``{axes, overall, rationale, model}``
    on success or ``{error, model}`` on failure - never raises."""
    chosen = model or _default_model()
    messages = [
        {"role": "system", "content": _system_prompt()},
        {"role": "user", "content": _user_prompt(plan, fixture)},
    ]
    try:
        response = await litellm.acompletion(
            model=chosen,
            messages=messages,
            tools=[_SCORE_TOOL],
            tool_choice={"type": "function", "function": {"name": "submit_score"}},
            stream=False,
        )
    except Exception as exc:
        logger.exception("judge[%s] LLM call failed", chosen)
        return {"error": f"judge LLM error: {exc}", "model": chosen}

    choices = getattr(response, "choices", None) or []
    if not choices:
        return {"error": "judge returned empty choices", "model": chosen}

    args = _parse_tool_args(choices[0].message)
    if args is None:
        return {"error": "judge did not call submit_score", "model": chosen}

    axes_raw = args.get("axes") or {}
    axes = {axis: int(axes_raw.get(axis, 0)) for axis in AXES}
    return {
        "axes": axes,
        "overall": _overall(axes),
        "rationale": str(args.get("rationale") or "").strip(),
        "model": chosen,
    }
