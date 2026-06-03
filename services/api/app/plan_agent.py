# SPDX-License-Identifier: MIT
"""Plan generation entry point.

The plan feature is now declared, not coded: two AgentSpecs in `agents.py`
(generator `plan` + evaluator `evaluate-plan`) running on the generic
`run_subagent` engine. The generator gathers athlete data, researches the
science, drafts a 2-week plan in the universal session grammar, spawns the
evaluator (capped at EVAL_ROUND_CAP rounds), revises, and submits.

This module is the thin caller the chat agent already imports; it just
delegates to `agents.spawn("plan", ...)`. All training intelligence lives in
the two skills + the model; all plumbing lives in agents.py + subagent.py.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from . import agents, usage

logger = logging.getLogger(__name__)

EventSink = Callable[[str, dict[str, Any]], Awaitable[None]]

_PLAN_TASK = (
    "Build this athlete's 2-week training plan now. Gather their data, research "
    "the science, draft it in the universal session grammar, get it evaluated, "
    "revise, and submit."
)


async def generate_plan(
    account_id: str,
    on_event: EventSink | None = None,
) -> dict[str, Any]:
    """Run the generator agent (which nests the evaluator). Returns the
    submitted plan {rationale, weeks} or {"error": ...}."""
    # Mark this request as a plan generation so it is charged plan credits, not
    # chat credits, regardless of how many internal LLM calls the sub-agents make.
    usage.mark_plan()
    return await agents.spawn("plan", _PLAN_TASK, account_id, on_event)
