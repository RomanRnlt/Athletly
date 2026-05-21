"""Generic autonomous sub-agent runner.

A sub-agent is a skill-driven litellm loop with its own model, system prompt
(the skill markdown), and tool set. It runs WITHOUT user turns: it reads its
task, calls tools, and finishes either by calling a designated terminal tool
(whose arguments become the structured result) or by running out of content
to produce.

This is pure plumbing. All domain behaviour lives in the skill + the tools.
The same runner powers both the plan generator and the plan evaluator; the
generator nests the evaluator by exposing a tool whose handler calls
run_subagent again.
"""

from __future__ import annotations

import inspect
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

import litellm

logger = logging.getLogger(__name__)

# A tool handler may be sync or async. It receives parsed args, returns a dict.
ToolHandler = Callable[..., dict[str, Any] | Awaitable[dict[str, Any]]]
EventSink = Callable[[str, dict[str, Any]], Awaitable[None]]


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


async def run_subagent(
    *,
    skill: str,
    model: str,
    task: str,
    tools: list[dict[str, Any]],
    registry: dict[str, ToolHandler],
    terminal_tool: str | None = None,
    max_turns: int = 8,
    on_event: EventSink | None = None,
) -> dict[str, Any]:
    """Run an autonomous sub-agent. Returns the terminal tool's args, or
    ``{"text": <final assistant text>}`` if it ended without calling it.
    """

    async def emit(event_type: str, payload: dict[str, Any]) -> None:
        if on_event is not None:
            await on_event(event_type, payload)

    history: list[dict[str, Any]] = [
        {"role": "system", "content": skill},
        {"role": "user", "content": task},
    ]

    for _turn in range(max_turns):
        try:
            response = await litellm.acompletion(
                model=model,
                messages=history,
                tools=tools,
                tool_choice="auto",
                stream=False,
            )
        except Exception as exc:
            logger.exception("sub-agent completion failed")
            return {"error": f"sub-agent LLM error: {exc}"}

        message = response.choices[0].message
        tool_calls = getattr(message, "tool_calls", None) or []

        if not tool_calls:
            return {"text": message.content or ""}

        # Record the assistant turn (content + the tool calls it requested).
        history.append(
            {
                "role": "assistant",
                "content": message.content or None,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments or "{}",
                        },
                    }
                    for tc in tool_calls
                ],
            }
        )

        for tc in tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            await emit("tool_call", {"name": name, "args": args})

            if terminal_tool and name == terminal_tool:
                # The terminal tool's arguments ARE the result. Stop here.
                await emit("tool_result", {"name": name, "preview": "submitted"})
                return args

            handler = registry.get(name)
            if handler is None:
                result: dict[str, Any] = {"error": f"unknown tool: {name}"}
            else:
                try:
                    result = await _maybe_await(handler(**args))
                except TypeError as exc:
                    result = {"error": f"bad args for {name}: {exc}"}
                except Exception as exc:
                    logger.exception("sub-agent tool %s failed", name)
                    result = {"error": f"tool {name} crashed: {exc}"}

            await emit("tool_result", {"name": name, "preview": _short(result)})

            history.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, default=str),
                }
            )

    return {"error": f"sub-agent hit max_turns ({max_turns}) without finishing"}


def _short(result: dict[str, Any]) -> str:
    if "error" in result:
        return f"error: {result['error']}"
    if "approved" in result:
        return f"approved={result['approved']}"
    keys = list(result.keys())
    return ", ".join(keys[:4]) if keys else "ok"
