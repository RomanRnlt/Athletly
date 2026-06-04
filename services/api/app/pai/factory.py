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


# A full 2-week plan (rationale + 14 days of detailed sessions) is large. The
# previous engine used litellm's high default; pydantic-ai's Anthropic default is
# only 4096, which truncated the output mid-plan (the `weeks` field went missing).
MAX_OUTPUT_TOKENS = 32000


def _model_settings(model: str) -> dict[str, Any]:
    """max_tokens generous enough for a full plan, plus Anthropic prompt caching
    (cache the stable instructions + tool defs)."""
    settings: dict[str, Any] = {"max_tokens": MAX_OUTPUT_TOKENS}
    if model.startswith("anthropic"):
        settings["anthropic_cache_instructions"] = True
        settings["anthropic_cache_tool_definitions"] = True
    return settings


def build_agent(
    *,
    model: str,
    instructions: str,
    tool_names: list[str] | tuple[str, ...],
    output_type: Any,
    deps_type: type = Deps,
    retries: int = 2,
    extra_tools: list[Any] | None = None,
) -> Agent[Deps, Any]:
    """Construct a pydantic-ai Agent from skill-derived parts.

    ``model`` is a litellm-style id (mapped to pydantic-ai form). ``retries`` is
    the output-validation retry budget, so a structural/invariant violation gets
    re-generated instead of shipped. ``extra_tools`` are additional pydantic-ai
    Tools beyond the skill's allowed-tools, e.g. spawn-delegation tools that run
    a child agent.
    """
    pai_model = to_pai_model(model)
    return Agent(
        pai_model,
        deps_type=deps_type,
        output_type=output_type,
        # The skill body is the system message (matches the previous engine,
        # which seeded a {"role": "system", "content": skill} turn).
        system_prompt=instructions,
        tools=[*build_tools(tool_names), *(extra_tools or [])],
        model_settings=_model_settings(pai_model),
        retries=retries,
    )
