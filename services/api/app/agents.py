"""Declarative agent registry, built from SKILL.md frontmatter.

An agent is NOT custom Python. An agent = a skill folder (Agent Skills standard)
whose ``metadata.athletly`` frontmatter declares everything operational: model,
allowed tools, spawnable children, terminal tool + its strict schema, output
kind, caps. ``AGENT_SPECS`` is BUILT by scanning ``skills/`` and parsing
frontmatter, so a new feature = a new skill folder, zero Python.

``subagent.run_subagent`` is the generic engine. This module wires specs to it:
assembles each agent's tool set, exposes spawnable children as tools, nests one
agent in another. Inline skills (e.g. onboarding) are NOT registry agents; they
are injected into the chat prompt by code on a deterministic trigger.
"""

from __future__ import annotations

import importlib.util
import json
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from . import tools as tools_mod
from .config import settings
from .skills import ParsedSkill, get_skill, load_skill, scan_skills
from .subagent import run_subagent

logger = logging.getLogger(__name__)

EventSink = Callable[[str, dict[str, Any]], Awaitable[None]]

# Runaway guards (things markdown cannot enforce).
MAX_SPAWN_DEPTH = 3
# Prefix for the task we hand a spawned child; the child's skill body explains
# what its JSON input contains.
_SPAWN_TASK_PREFIX = "Input (JSON):\n"


@dataclass(frozen=True)
class AgentSpec:
    """One agent, derived from a skill's frontmatter. ``terminal_tool`` ends the
    run and its arguments (validated by ``terminal_schema``) are the result."""

    name: str
    skill: str
    model: str
    tools: tuple[str, ...]
    spawns: tuple[str, ...]
    terminal_tool: str
    terminal_schema: dict[str, Any]
    terminal_description: str
    max_turns: int = 16
    round_cap: int | None = None
    # Optional deterministic validator script (relative path inside the skill
    # folder) run on the terminal result; coerces slips, logs grammar issues.
    validator: str | None = None
    # Chat exposure via run_specialist:
    chat_triggerable: bool = False
    chat_description: str = ""
    default_task: str = ""
    output_kind: str = "ephemeral"
    # How this agent is exposed AS a tool to a parent (None for root agents):
    spawn_tool_name: str | None = None
    spawn_description: str = ""
    spawn_input_schema: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Build the registry from skill frontmatter
# ---------------------------------------------------------------------------


def _resolve_model(value: str) -> str:
    """Map a frontmatter model alias to a configured model, else pass through."""
    return {
        "plan_model": settings.plan_model,
        "chat_model": settings.chat_model,
    }.get(value, value)


def _resolve_schema(name: str | None) -> dict[str, Any]:
    if not name:
        return {"type": "object", "properties": {}}
    schema = tools_mod.SCHEMA_REGISTRY.get(name)
    if schema is None:
        logger.warning("Unknown schema reference '%s' in skill frontmatter", name)
        return {"type": "object", "properties": {}}
    return schema


def _spec_from_skill(skill: ParsedSkill) -> AgentSpec | None:
    """Build an AgentSpec from a skill whose activation is 'spawn'. Inline skills
    (onboarding) return None - they are not registry agents."""
    meta = skill.athletly
    if meta.get("activation") != "spawn":
        return None

    tools = tuple((skill.frontmatter.get("allowed-tools") or "").split())

    spawn_input_schema = None
    spawn_tool_name = meta.get("spawn_tool_name")
    spawn_arg = meta.get("spawn_arg")
    if spawn_tool_name and spawn_arg:
        spawn_input_schema = {
            "type": "object",
            "properties": {spawn_arg: _resolve_schema(meta.get("spawn_arg_schema"))},
            "required": [spawn_arg],
        }

    return AgentSpec(
        name=skill.name,
        skill=skill.name,
        model=_resolve_model(str(meta.get("model", "chat_model"))),
        tools=tools,
        spawns=tuple(meta.get("spawns") or ()),
        terminal_tool=str(meta.get("terminal_tool", "")),
        terminal_schema=_resolve_schema(meta.get("terminal_schema")),
        terminal_description=str(
            meta.get("terminal_description", "Submit your result. Ends your work.")
        ).strip(),
        max_turns=int(meta.get("max_turns", 16)),
        round_cap=meta.get("round_cap"),
        validator=meta.get("validator"),
        chat_triggerable=bool(meta.get("chat_triggerable", False)),
        chat_description=skill.description,
        default_task=str(meta.get("default_task", "")).strip(),
        output_kind=str(meta.get("output_kind", "ephemeral")),
        spawn_tool_name=spawn_tool_name,
        spawn_description=str(meta.get("spawn_description", "")).strip(),
        spawn_input_schema=spawn_input_schema,
    )


@lru_cache(maxsize=1)
def _build_specs() -> dict[str, AgentSpec]:
    specs: dict[str, AgentSpec] = {}
    for skill in scan_skills().values():
        spec = _spec_from_skill(skill)
        if spec is not None:
            specs[spec.name] = spec
    logger.info("Agent registry: %s", ", ".join(sorted(specs)) or "(empty)")
    return specs


# Built once at import (skills are read-only at runtime). agent.py reads this.
AGENT_SPECS: dict[str, AgentSpec] = _build_specs()


# ---------------------------------------------------------------------------
# Generic chat trigger: ONE tool the coach model uses to launch any
# chat-triggerable specialist. A new specialist needs only a skill folder.
# ---------------------------------------------------------------------------

RUN_SPECIALIST_TOOL_NAME = "run_specialist"


def chat_triggerable_agents() -> list[str]:
    return [name for name, spec in AGENT_SPECS.items() if spec.chat_triggerable]


def chat_specialist_tool_schema() -> dict[str, Any]:
    """run_specialist schema, with the agent enum + help text sourced from the
    discovered registry so it stays in sync with the skills on disk."""
    triggerable = [(n, s) for n, s in AGENT_SPECS.items() if s.chat_triggerable]
    names = [n for n, _ in triggerable]
    bullets = "\n".join(f"- {n}: {s.chat_description}" for n, s in triggerable)
    description = (
        "Launch a specialist sub-agent for a heavier, autonomous job; its progress "
        "streams to the user. Available agents:\n"
        f"{bullets}\n"
        "Pick the agent that matches the user's request and pass a concrete task. "
        "Set reset=true to discard the current draft/output and start fresh "
        "(regenerate); leave it false to build when none exists yet."
    )
    return {
        "type": "function",
        "function": {
            "name": RUN_SPECIALIST_TOOL_NAME,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": {
                    "agent": {
                        "type": "string",
                        "enum": names,
                        "description": "Which specialist to run.",
                    },
                    "task": {
                        "type": "string",
                        "description": "Concrete instruction for the specialist.",
                    },
                    "reset": {
                        "type": "boolean",
                        "description": "Discard the current draft/output first (regenerate). Default false.",
                    },
                },
                "required": ["agent", "task"],
            },
        },
    }


# ---------------------------------------------------------------------------
# Spawn engine
# ---------------------------------------------------------------------------


def _terminal_tool_schema(spec: AgentSpec) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": spec.terminal_tool,
            "description": spec.terminal_description,
            "parameters": spec.terminal_schema,
        },
    }


def _spawn_tool_schema(child: AgentSpec) -> dict[str, Any]:
    if not child.spawn_tool_name or child.spawn_input_schema is None:
        raise ValueError(f"agent '{child.name}' is not declared as spawnable")
    return {
        "type": "function",
        "function": {
            "name": child.spawn_tool_name,
            "description": child.spawn_description,
            "parameters": child.spawn_input_schema,
        },
    }


@lru_cache(maxsize=8)
def _load_validator(skill_name: str, rel_path: str) -> Any:
    """Import a skill's validator script (lives in the skill folder, agentskills
    style). Cached. Returns the module or None."""
    skill = get_skill(skill_name)
    if skill is None:
        return None
    path = skill.directory / rel_path
    if not path.exists():
        logger.warning("validator script not found: %s", path)
        return None
    spec = importlib.util.spec_from_file_location(f"_skill_validator_{skill_name}", path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _apply_validator(spec: AgentSpec, result: dict[str, Any]) -> dict[str, Any]:
    """Run the skill's validator on a terminal result: coerce serialization
    slips, then validate. Logs grammar issues; never raises. Domain rules live
    in the skill's script, this is just the generic trigger."""
    module = _load_validator(spec.skill, spec.validator or "")
    if module is None:
        return result
    coerced = module.coerce(result) if hasattr(module, "coerce") else result
    problems = list(module.validate(coerced)) if hasattr(module, "validate") else []
    if problems:
        logger.warning(
            "validator(%s): %d issue(s): %s",
            spec.skill,
            len(problems),
            "; ".join(problems[:5]),
        )
        return {**coerced, "_validation_warnings": problems}
    logger.info("validator(%s): grammar clean", spec.skill)
    return coerced


def _data_registry(account_id: str, names: tuple[str, ...]) -> dict[str, Any]:
    """Account-bound closures for the given data tool names, via shared dispatch."""
    registry: dict[str, Any] = {}
    for name in names:
        registry[name] = (lambda n: (lambda **kw: tools_mod.dispatch(account_id, n, kw)))(name)
    return registry


def _make_spawn_handler(
    child: AgentSpec,
    account_id: str,
    on_event: EventSink | None,
    depth: int,
) -> Any:
    """Tool handler a parent calls to launch ``child``. Enforces the optional
    round cap: once exceeded, returns a forced-approval verdict so the parent
    stops looping and submits its best draft (quality judgement stays with the
    child skill; the cap only counts rounds)."""

    state = {"rounds": 0}
    # The child runs at spawn _depth=`depth`; its events render at depth+1.
    child_display_depth = depth + 1

    async def _status(label: str) -> None:
        if on_event is not None:
            await on_event(
                "status",
                {"label": label, "depth": child_display_depth, "agent": child.name},
            )

    async def handler(**args: Any) -> dict[str, Any]:
        state["rounds"] += 1
        if child.round_cap is not None and state["rounds"] > child.round_cap:
            logger.info(
                "spawn cap: %s reached %d rounds, forcing best-effort submit",
                child.name,
                child.round_cap,
            )
            await _status(f"{child.name}: Cap erreicht, bester Entwurf wird genommen")
            return {
                "approved": True,
                "forced": True,
                "score": 0,
                "issues": [],
                "suggestions": [],
                "summary": (
                    f"Evaluation cap reached ({child.round_cap} rounds). Submit your "
                    "best current plan now via the terminal tool; do not request "
                    "another evaluation."
                ),
            }
        await _status(f"{child.name} laeuft")
        task = _SPAWN_TASK_PREFIX + json.dumps(args, ensure_ascii=False)
        return await spawn(child.name, task, account_id, on_event, depth)

    return handler


async def spawn(
    name: str,
    task: str,
    account_id: str,
    on_event: EventSink | None = None,
    _depth: int = 0,
) -> dict[str, Any]:
    """Launch the agent ``name`` with ``task``. Returns the terminal tool's
    arguments (the structured result) or {"error": ...}."""
    spec = AGENT_SPECS.get(name)
    if spec is None:
        return {"error": f"unknown agent: {name}"}
    if _depth > MAX_SPAWN_DEPTH:
        return {"error": f"max spawn depth ({MAX_SPAWN_DEPTH}) exceeded"}

    tools: list[dict[str, Any]] = list(tools_mod.schemas_for(set(spec.tools)))
    tools.append(_terminal_tool_schema(spec))
    registry = _data_registry(account_id, spec.tools)

    for child_name in spec.spawns:
        child = AGENT_SPECS[child_name]
        tools.append(_spawn_tool_schema(child))
        registry[child.spawn_tool_name] = _make_spawn_handler(  # type: ignore[index]
            child, account_id, on_event, _depth + 1
        )

    # Tag every event this agent emits with its nesting depth + name, so the
    # client can render sub-agent work indented (Claude-Code style). The coach
    # is the implicit depth-0 root, so a spawned agent renders at _depth + 1.
    display_depth = _depth + 1

    async def sink(event_type: str, payload: dict[str, Any]) -> None:
        if on_event is None:
            return
        tagged = dict(payload)
        tagged.setdefault("depth", display_depth)
        tagged.setdefault("agent", spec.name)
        await on_event(event_type, tagged)

    result = await run_subagent(
        skill=load_skill(spec.skill),
        model=spec.model,
        task=task,
        tools=tools,
        registry=registry,
        terminal_tool=spec.terminal_tool,
        max_turns=spec.max_turns,
        on_event=sink,
    )

    if spec.validator and isinstance(result, dict) and "error" not in result:
        result = _apply_validator(spec, result)
    return result
