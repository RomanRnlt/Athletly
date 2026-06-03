# SPDX-License-Identifier: MIT
"""Adapt the existing athletly tools to pydantic-ai tools.

The litellm implementation already has 12 typed tool functions (``tools.py``)
with hand-written JSON Schemas (``TOOL_SCHEMAS``). Rather than rewrite each one,
we wrap them with ``Tool.from_schema``: pydantic-ai validates the model's args
against the existing JSON Schema, then calls our adapter with
``RunContext[Deps]`` so the underlying function gets the account_id. One source
of truth for tool behaviour stays in ``tools.py``.
"""

from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext, Tool

from .. import tools as legacy
from .deps import Deps


def _schema_map() -> dict[str, dict[str, Any]]:
    """name -> the {name, description, parameters} block from TOOL_SCHEMAS."""
    return {s["function"]["name"]: s["function"] for s in legacy.TOOL_SCHEMAS}


def _adapter_for(name: str):
    fn = legacy.TOOL_REGISTRY[name]

    def adapter(ctx: RunContext[Deps], **kwargs: Any) -> dict[str, Any]:
        # The legacy function takes account_id first, then the validated args.
        return fn(ctx.deps.account_id, **kwargs)

    adapter.__name__ = f"tool_{name}"
    return adapter


def build_tools(names: list[str] | tuple[str, ...]) -> list[Tool[Deps]]:
    """Build pydantic-ai Tools for the given tool names (a skill's allowed-tools).

    Unknown names are skipped (a skill may list a tool that no longer exists).
    """
    schemas = _schema_map()
    tools: list[Tool[Deps]] = []
    for name in names:
        if name not in legacy.TOOL_REGISTRY or name not in schemas:
            continue
        meta = schemas[name]
        tools.append(
            Tool.from_schema(
                function=_adapter_for(name),
                name=name,
                description=meta.get("description", ""),
                json_schema=meta.get("parameters", {"type": "object", "properties": {}}),
                takes_ctx=True,
            )
        )
    return tools
