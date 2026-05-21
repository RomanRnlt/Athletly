"""Plan generation orchestration.

Two nested autonomous sub-agents, both running on the plan model:

  generate_plan  -> Generator sub-agent (skill: plan)
       gathers athlete data, researches the science (web_search), drafts a
       2-week plan, calls evaluate_plan, revises, then submit_plan.
  evaluate_plan  -> Evaluator sub-agent (skill: evaluate-plan)
       independently re-reads the athlete and judges the draft, returning
       {approved, score, issues, suggestions, summary} via submit_evaluation.

All training intelligence lives in the two skills + the model. This module is
plumbing: it wires tools to sub-agents, nests the evaluator inside the
generator, and forwards status events to the caller.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from . import tools as tools_mod
from .config import settings
from .skills import load_skill
from .subagent import run_subagent

logger = logging.getLogger(__name__)

EventSink = Callable[[str, dict[str, Any]], Awaitable[None]]

DATA_TOOL_NAMES = {
    "read_athlete_profile",
    "get_weekly_load",
    "search_activities",
    "get_daily_metrics",
}

# --- Plan JSON shape (the contract; not domain validation) -----------------

SUBMIT_PLAN_TOOL = {
    "type": "function",
    "function": {
        "name": "submit_plan",
        "description": (
            "Submit the final 2-week training plan with its rationale. Call this "
            "only after the plan has been evaluated and approved. This ends your work."
        ),
        "parameters": tools_mod.PLAN_SCHEMA,
    },
}

EVALUATE_PLAN_TOOL = {
    "type": "function",
    "function": {
        "name": "evaluate_plan",
        "description": (
            "Send a draft plan to the independent evaluator. Returns {approved, "
            "score, issues, suggestions, summary}. Call before submit_plan; revise "
            "and re-evaluate until approved."
        ),
        "parameters": {
            "type": "object",
            "properties": {"plan": tools_mod.PLAN_SCHEMA},
            "required": ["plan"],
        },
    },
}

SUBMIT_EVALUATION_TOOL = {
    "type": "function",
    "function": {
        "name": "submit_evaluation",
        "description": "Submit your verdict on the plan. Ends your evaluation.",
        "parameters": {
            "type": "object",
            "properties": {
                "approved": {"type": "boolean"},
                "score": {"type": "integer"},
                "issues": {"type": "array", "items": {"type": "string"}},
                "suggestions": {"type": "array", "items": {"type": "string"}},
                "summary": {"type": "string"},
            },
            "required": ["approved", "score", "summary"],
        },
    },
}

MAX_GENERATOR_TURNS = 16
MAX_EVALUATOR_TURNS = 10


def _data_registry(account_id: str) -> dict[str, Any]:
    return {
        "read_athlete_profile": lambda **kw: tools_mod.read_athlete_profile(
            account_id=account_id, **kw
        ),
        "get_weekly_load": lambda **kw: tools_mod.get_weekly_load(account_id=account_id, **kw),
        "search_activities": lambda **kw: tools_mod.search_activities(
            account_id=account_id, **kw
        ),
        "get_daily_metrics": lambda **kw: tools_mod.get_daily_metrics(
            account_id=account_id, **kw
        ),
    }


async def _run_evaluator(
    account_id: str,
    plan: dict[str, Any],
    on_event: EventSink | None,
) -> dict[str, Any]:
    model = settings.plan_model
    tools = (
        tools_mod.schemas_for(DATA_TOOL_NAMES)
        + tools_mod.web_search_tool_for(model)
        + [SUBMIT_EVALUATION_TOOL]
    )
    task = (
        "Evaluate this proposed 2-week training plan for the athlete. "
        "Verify it against their real data, then submit your verdict.\n\n"
        + json.dumps(plan, ensure_ascii=False)
    )
    return await run_subagent(
        skill=load_skill("evaluate-plan"),
        model=model,
        task=task,
        tools=tools,
        registry=_data_registry(account_id),
        terminal_tool="submit_evaluation",
        max_turns=MAX_EVALUATOR_TURNS,
        on_event=on_event,
    )


async def generate_plan(
    account_id: str,
    on_event: EventSink | None = None,
) -> dict[str, Any]:
    """Run the generator sub-agent (which nests the evaluator). Returns the
    submitted plan {rationale, weeks} or {"error": ...}.
    """
    model = settings.plan_model

    async def evaluate_plan_handler(plan: dict[str, Any]) -> dict[str, Any]:
        if on_event:
            await on_event("status", {"label": "Evaluator prueft den Plan"})
        return await _run_evaluator(account_id, plan, on_event)

    registry = {
        **_data_registry(account_id),
        "evaluate_plan": evaluate_plan_handler,
    }
    tools = (
        tools_mod.schemas_for(DATA_TOOL_NAMES)
        + tools_mod.web_search_tool_for(model)
        + [EVALUATE_PLAN_TOOL, SUBMIT_PLAN_TOOL]
    )
    task = (
        "Build this athlete's 2-week training plan now. Gather their data, "
        "research the science, draft, get it evaluated, revise, and submit."
    )
    return await run_subagent(
        skill=load_skill("plan"),
        model=model,
        task=task,
        tools=tools,
        registry=registry,
        terminal_tool="submit_plan",
        max_turns=MAX_GENERATOR_TURNS,
        on_event=on_event,
    )
