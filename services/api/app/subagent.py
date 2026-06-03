# SPDX-License-Identifier: MIT
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

import asyncio
import inspect
import json
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

import litellm

from . import usage

logger = logging.getLogger(__name__)

# A tool handler may be sync or async. It receives parsed args, returns a dict.
ToolHandler = Callable[..., dict[str, Any] | Awaitable[dict[str, Any]]]
EventSink = Callable[[str, dict[str, Any]], Awaitable[None]]


class EarlyTerminal(Exception):
    """Raised by a tool handler to end the whole sub-agent run immediately with
    a given result, bypassing the model's own terminal-tool call. Used by the
    eval round cap to submit the best draft directly instead of paying for
    another full plan generation."""

    def __init__(self, result: dict[str, Any]):
        super().__init__("early terminal")
        self.result = result


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
    label: str = "agent",
) -> dict[str, Any]:
    """Run an autonomous sub-agent. Returns the terminal tool's args, or
    ``{"text": <final assistant text>}`` if it ended without calling it.

    Emits a structured trace to the logger (per-turn LLM latency, each tool
    call, total time) so token-heavy runs are observable in the server logs.
    """

    async def emit(event_type: str, payload: dict[str, Any]) -> None:
        if on_event is not None:
            await on_event(event_type, payload)

    history: list[dict[str, Any]] = [
        {"role": "system", "content": skill},
        {"role": "user", "content": task},
    ]

    last_text = ""  # best-effort: last assistant prose, surfaced on max_turns
    t_start = time.monotonic()
    logger.info("trace[%s] start model=%s task=%dch", label, model, len(task))

    for _turn in range(max_turns):
        t_turn = time.monotonic()
        # One retry on transient timeouts / connection errors. Anthropic+litellm
        # occasionally stall a single completion (seen 1800s+ in the wild); a
        # fresh request usually completes fast. Non-transient errors fail fast.
        response = None
        last_exc: Exception | None = None
        for attempt in range(2):
            try:
                response = await litellm.acompletion(
                    model=model,
                    messages=history,
                    tools=tools,
                    tool_choice="auto",
                    stream=False,
                    timeout=240,
                )
                break
            except Exception as exc:
                last_exc = exc
                transient = (
                    "Timeout" in type(exc).__name__
                    or "Connection" in type(exc).__name__
                )
                if attempt == 0 and transient:
                    logger.warning(
                        "trace[%s] transient %s on attempt 1, retrying once",
                        label,
                        type(exc).__name__,
                    )
                    await asyncio.sleep(2)
                    continue
                logger.exception("trace[%s] completion failed", label)
                return {"error": f"sub-agent LLM error: {exc}"}
        if response is None:
            logger.warning("trace[%s] all retries failed: %s", label, last_exc)
            return {"error": f"sub-agent LLM error after retry: {last_exc}"}
        usage.add_response(response, model)
        llm_dt = time.monotonic() - t_turn

        # Providers can return a response with no choices (safety filter, token
        # cap, transient empty candidates - seen with Gemini). Never index
        # blindly; degrade to best-effort instead of crashing the whole spawn.
        choices = getattr(response, "choices", None) or []
        if not choices:
            logger.warning("sub-agent got empty choices from %s", model)
            out: dict[str, Any] = {"error": "sub-agent got empty response (no choices)"}
            if last_text:
                out["text"] = last_text
            return out

        message = choices[0].message
        tool_calls = getattr(message, "tool_calls", None) or []
        logger.info(
            "trace[%s] turn %d: llm %.1fs, %d tool_call(s)",
            label,
            _turn + 1,
            llm_dt,
            len(tool_calls),
        )

        if message.content:
            last_text = message.content

        if not tool_calls:
            logger.info(
                "trace[%s] done: text-only, %d turns, %.1fs total",
                label,
                _turn + 1,
                time.monotonic() - t_start,
            )
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
                logger.info(
                    "trace[%s] done: %s submitted, %d turns, %.1fs total",
                    label,
                    name,
                    _turn + 1,
                    time.monotonic() - t_start,
                )
                return args

            handler = registry.get(name)
            t_tool = time.monotonic()
            if handler is None:
                result: dict[str, Any] = {"error": f"unknown tool: {name}"}
            else:
                try:
                    result = await _maybe_await(handler(**args))
                except EarlyTerminal as term:
                    # A handler asked to end the run now with its result (eval
                    # cap -> submit the best draft, no extra generation).
                    logger.info(
                        "trace[%s] early-terminal via %s, %d turns, %.1fs total",
                        label,
                        name,
                        _turn + 1,
                        time.monotonic() - t_start,
                    )
                    return term.result
                except TypeError as exc:
                    result = {"error": f"bad args for {name}: {exc}"}
                except Exception as exc:
                    logger.exception("trace[%s] tool %s crashed", label, name)
                    result = {"error": f"tool {name} crashed: {exc}"}

            preview = _short(result)
            logger.info(
                "trace[%s]   %s -> %s (%.1fs)",
                label,
                name,
                preview,
                time.monotonic() - t_tool,
            )
            await emit("tool_result", {"name": name, "preview": preview})

            history.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, default=str),
                }
            )

    # Ran out of turns without calling the terminal tool. Surface the last
    # assistant prose so the caller has something usable to log/show rather
    # than a bare error (best-effort, ADR agent-architecture decision 2).
    logger.warning(
        "trace[%s] hit max_turns (%d), %.1fs total", label, max_turns, time.monotonic() - t_start
    )
    result: dict[str, Any] = {
        "error": f"sub-agent hit max_turns ({max_turns}) without finishing"
    }
    if last_text:
        result["text"] = last_text
    return result


def _short(result: dict[str, Any]) -> str:
    if "error" in result:
        return f"error: {result['error']}"
    if "approved" in result:
        return f"approved={result['approved']}"
    keys = list(result.keys())
    return ", ".join(keys[:4]) if keys else "ok"
