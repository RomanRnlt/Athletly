# SPDX-License-Identifier: MIT
"""Typed dependency context injected into every pydantic-ai tool.

Replaces the per-tool ``account_id`` closures of the litellm implementation:
tools now receive ``RunContext[Deps]`` and read ``ctx.deps.account_id``.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Deps:
    """Per-run dependencies. The handler passes the JWT-verified account_id."""

    account_id: str
