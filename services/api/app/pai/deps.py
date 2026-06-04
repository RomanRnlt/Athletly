# SPDX-License-Identifier: MIT
"""Typed dependency context injected into every pydantic-ai tool.

Replaces the per-tool ``account_id`` closures of the litellm implementation:
tools now receive ``RunContext[Deps]`` and read ``ctx.deps.account_id``.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Deps:
    """Per-run dependencies. The handler passes the JWT-verified account_id.

    ``web_search_budget`` bounds open-ended research: the previous engine capped
    the whole loop at ``max_turns``; pydantic-ai runs until the model finishes,
    so without a brake a thorough model researches forever. After the budget the
    web_search tool tells the model to stop searching and draft. ``web_search_used``
    is a per-run mutable counter (the same Deps instance is shared across the run).
    """

    account_id: str
    web_search_budget: int = 8
    web_search_used: int = 0
