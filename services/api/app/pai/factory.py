# SPDX-License-Identifier: MIT
"""Compile a skill into a pydantic-ai Agent.

This is the heart of the migration (and, generalized, of Karl): a SKILL.md
becomes a typed pydantic-ai ``Agent`` whose instructions are the skill body,
whose tools are the skill's ``allowed-tools`` wrapped from ``tools.py``, and
whose ``output_type`` is the Pydantic model the skill targets. Anthropic prompt
caching is enabled via model settings (replacing the manual cache_control).
"""

from __future__ import annotations

from typing import Any

from pydantic_ai import Agent

from .deps import Deps
from .toolset import build_tools


def to_pai_model(litellm_model: str) -> str:
    """Map a litellm model id to a pydantic-ai model string.

    ``anthropic/claude-sonnet-4-5`` -> ``anthropic:claude-sonnet-4-5``.
    """
    return litellm_model.replace("/", ":", 1)


def _cache_settings(model: str) -> dict[str, Any] | None:
    """Anthropic prompt caching: cache the (stable) instructions + tool defs."""
    if model.startswith("anthropic"):
        return {
            "anthropic_cache_instructions": True,
            "anthropic_cache_tool_definitions": True,
        }
    return None


def build_agent(
    *,
    model: str,
    instructions: str,
    tool_names: list[str] | tuple[str, ...],
    output_type: Any,
    deps_type: type = Deps,
    retries: int = 2,
) -> Agent[Deps, Any]:
    """Construct a pydantic-ai Agent from skill-derived parts.

    ``model`` is a litellm-style id (mapped to pydantic-ai form). ``retries`` is
    the output-validation retry budget, so a structural/invariant violation gets
    re-generated instead of shipped.
    """
    pai_model = to_pai_model(model)
    return Agent(
        pai_model,
        deps_type=deps_type,
        output_type=output_type,
        instructions=instructions,
        tools=build_tools(tool_names),
        model_settings=_cache_settings(pai_model),
        retries=retries,
    )
