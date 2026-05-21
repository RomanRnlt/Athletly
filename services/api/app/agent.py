"""Chat agent: litellm streaming + tool calling over the Garmin SQLite store.

stream_chat() is a multi-turn loop. Each iteration starts a new streamed
completion; when the model emits tool_calls we execute them locally, append
the tool turns to history, and loop again. Final text deltas plus tool
events are surfaced as a single AsyncIterator of (event_type, payload)
tuples so the FastAPI SSE endpoint can forward them without knowing the
agent's internal state machine.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator, Callable
from typing import Any

import litellm

from . import agents, db, garmin, profile, skills
from .config import settings
from .schemas import ChatMessage
from .tools import (
    SERVER_TOOL_NAMES,
    TOOL_REGISTRY,
    TOOL_SCHEMAS,
    dispatch,
)

ONBOARDING_TURN_CAP = 18  # safety net: force-complete onboarding past this

# Tools whose execution streams progress (run a specialist sub-agent) rather
# than returning a single dict. The generic run_specialist trigger is the only
# one: it can launch any chat-triggerable agent from the registry. It is NOT in
# TOOL_REGISTRY (not plain-dispatched).
STREAMING_TOOLS = {agents.RUN_SPECIALIST_TOOL_NAME}


def _tools_for_model(chosen_model: str) -> list[dict[str, Any]]:  # noqa: ARG001
    # run_specialist is composed here (its agent enum is derived from the
    # registry) and appended to the static dispatch tools.
    return list(TOOL_SCHEMAS) + [agents.chat_specialist_tool_schema()]


logger = logging.getLogger(__name__)


BASE_SYSTEM_PROMPT = """Du bist Ohm, der Coach in der Athletly App. Du sprichst Roman direkt
und auf Augenhoehe an, kein Marketing-Sprech. Du bist warm aber praezise.

Verhalten:
- Antworte auf Deutsch, ausser Roman wechselt die Sprache.
- Halte Antworten kurz wenn die Frage kurz ist. Lieber ein Satz als ein Absatz.
- Wenn Trainingsfragen kommen: konkrete Zahlen aus den Garmin-Daten, klare
  Empfehlung, ein Grund dazu.
- Wenn du etwas nicht weisst, sag es. Erfinde keine Pace-Werte oder HF-Zonen.
- Stell maximal eine Rueckfrage am Stueck.

Daten-Tools (rufe sie auf wenn du echte Zahlen brauchst):
- search_activities: Liste der letzten Workouts, mit Filtern.
- get_activity_details: Eine Activity vollstaendig (HF, Power, Hoehenmeter).
- get_daily_metrics: Schlaf, HRV, Resting HR, Recovery der letzten Tage.
- get_weekly_load: Wochenvolumen + Vergleich zur Vorwoche.

Wenn search_activities oder get_daily_metrics leere Listen liefern: Roman hat
entweder Garmin noch nicht verbunden oder noch nicht synct. Sag ihm das er
in den Einstellungen Garmin verbinden und dann Sync starten soll.

Athlete-Profile-Tools:
- read_athlete_profile: Du brauchst das normalerweise NICHT, das Profil ist
  unten im Prompt schon eingebettet. Nur wenn du explizit die leeren
  Sections sehen willst.
- update_athlete_section: Schreibt eine Section neu. Nutze das wenn Roman
  dir etwas DAUERHAFTES erzaehlt - ein Ziel, eine Verletzung, ein Lebens-
  Constraint, eine Coaching-Praeferenz. Nicht jede Trainings-Beobachtung
  speichern, nur was ueber diese Unterhaltung hinaus zaehlt. Overwrite-
  not-append: wenn die Section schon Inhalt hat, merge ihn mit dem neuen
  Stuff im einen Update-Call, nicht zwei Updates hintereinander.

Trainingsplan:
- run_specialist: Startet einen Spezialisten-Agenten der autonom eine groessere
  Aufgabe erledigt. Fuer einen Plan: run_specialist(agent="plan", task="..."). Der
  Plan-Agent recherchiert, baut einen wissenschaftlich fundierten 2-Wochen-Plan
  und laesst ihn unabhaengig bewerten; danach existiert ein ENTWURF. Nutze das
  wenn Roman einen Plan will und noch keiner existiert. Bestaetige vorher KURZ
  den Fokus mit ihm (Ziel, Zeitraum), denn es dauert etwas. Fuer einen kompletten
  Neu-Plan von Null: reset=true setzen (verwirft den alten Entwurf) - nur wenn
  Roman grundlegend was anderes will, nicht fuer kleine Aenderungen.
- get_current_plan: Lies den aktuellen Plan (Entwurf oder aktiv) um mit Roman
  darueber zu reden oder ihn zu bearbeiten.
- update_plan: Wende Romans gewuenschte Aenderungen an. get_current_plan lesen,
  die weeks im Kopf anpassen, das ganze weeks-Array zurueckgeben. Fuer kleine
  Tweaks (Einheit verschieben, Step retargeten, Sportart tauschen).
- confirm_plan: Macht den Entwurf zum aktiven Plan. Erst wenn Roman explizit
  zustimmt.

Plan-Flow: Du legst den Entwurf vor, redest wie ein Coach mit Roman darueber,
passt per update_plan an bis es passt, dann confirm_plan. Der Plan erscheint
dann im Plan-Tab.

Stil:
- Keine Emojis ausser Roman benutzt sie zuerst.
- Keine Bullet-Listen wenn 1-2 Saetze reichen.
- Keine Em-Dashes, keine En-Dashes, nur normale Bindestriche.
"""


def _configure_provider_keys() -> None:
    if settings.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
    if settings.gemini_api_key:
        os.environ.setdefault("GEMINI_API_KEY", settings.gemini_api_key)


_configure_provider_keys()


MAX_TOOL_TURNS = 5


def _sanitize(text: str) -> str:
    """Strip em-dashes and en-dashes per user style rule."""
    return text.replace("—", "-").replace("–", "-")


# Predicates for inline-skill `activate_when` conditions (hermes-style
# declarative activation: the SKILL.md frontmatter names the condition, this
# generic evaluator decides if it currently holds). App-state conditions need a
# named predicate here because they are not uniformly inspectable like tool
# availability. Add a new inline skill = declare activate_when + one predicate.
INLINE_CONDITIONS: dict[str, Callable[[str], bool]] = {
    "onboarding_incomplete": lambda account_id: not profile.is_onboarded(account_id),
}


def _active_inline_skills(account_id: str) -> list:
    """Inline skills whose declared activate_when condition currently holds."""
    active = []
    for skill in skills.inline_skills():
        cond = skill.athletly.get("activate_when")
        predicate = INLINE_CONDITIONS.get(cond) if cond else None
        if predicate is None:
            if cond:
                logger.warning(
                    "inline skill %s has unknown activate_when '%s'", skill.name, cond
                )
            continue
        if predicate(account_id):
            active.append(skill)
    return active


def _system_prompt(account_id: str, messages: list[ChatMessage]) -> str:
    parts: list[str] = []

    onboarded = profile.is_onboarded(account_id)
    turns = len([m for m in messages if m.role == "user"])

    # Safety net: never let onboarding run forever, even if the model never
    # called mark_onboarding_complete. After the cap we flip the flag
    # deterministically so the onboarding condition stops holding next turn.
    if not onboarded and turns >= ONBOARDING_TURN_CAP:
        profile.mark_onboarded(account_id)
        onboarded = True

    # Inline skills go FIRST so the model treats an active one (e.g. onboarding)
    # as the dominant directive. Their activation is frontmatter-driven, not
    # hardcoded per skill.
    for skill in _active_inline_skills(account_id):
        body = skills.load_skill(skill.name)
        if body:
            parts.append(body)

    parts.append(BASE_SYSTEM_PROMPT)

    status = garmin.get_status(account_id)
    if status["connected"]:
        parts.append(
            f"Garmin-Status: verbunden als {status['display_name']}. "
            f"Aktivitaeten in DB: {status['activity_count']}. "
            f"Letzte Aktivitaet: {status.get('latest_activity_date') or 'unbekannt'}. "
            f"Letzter Sync: {status.get('last_sync_at') or 'noch nie'}."
        )
    else:
        parts.append(
            "Garmin-Status: NICHT verbunden. Roman muss erst in den Einstellungen verbinden."
        )

    narrative = profile.narrate_profile(account_id)
    if narrative:
        parts.append("Athlete-Profil (das ist alles was du dauerhaft ueber den User weisst):\n" + narrative)
    elif onboarded:
        parts.append(
            "Athlete-Profil: leer. Frag organisch nach Zielen, Vorlieben, Constraints, "
            "und speichere wichtiges per update_athlete_section ab."
        )

    return "\n\n".join(parts)


def _to_litellm_messages(account_id: str, messages: list[ChatMessage]) -> list[dict[str, Any]]:
    history: list[dict[str, Any]] = [
        {"role": "system", "content": _system_prompt(account_id, messages)}
    ]
    for m in messages:
        history.append({"role": m.role, "content": m.content})
    return history


async def stream_chat(
    account_id: str,
    messages: list[ChatMessage],
    model: str | None = None,
) -> AsyncIterator[tuple[str, dict[str, Any]]]:
    """Yield (event_type, payload) tuples.

    Event types: 'token', 'tool_call', 'tool_result', 'done', 'error'.
    The 'done' event is NOT emitted here; the FastAPI handler appends it.
    """
    chosen_model = model or settings.chat_model
    history = _to_litellm_messages(account_id, messages)
    tools_for_request = _tools_for_model(chosen_model)

    for turn in range(MAX_TOOL_TURNS):
        try:
            response = await litellm.acompletion(
                model=chosen_model,
                messages=history,
                tools=tools_for_request,
                tool_choice="auto",
                stream=True,
            )
        except Exception as exc:
            logger.exception("litellm acompletion failed")
            yield ("error", {"message": f"LLM-Fehler: {exc}"})
            return

        assistant_content = ""
        tool_buf: dict[int, dict[str, str]] = {}
        finish_reason: str | None = None

        async for chunk in response:
            choices = getattr(chunk, "choices", None)
            if not choices:
                continue
            choice = choices[0]
            delta = getattr(choice, "delta", None)
            if delta is not None:
                content = getattr(delta, "content", None)
                if content:
                    clean = _sanitize(content)
                    assistant_content += clean
                    yield ("token", {"delta": clean})

                tc_deltas = getattr(delta, "tool_calls", None)
                if tc_deltas:
                    for tc in tc_deltas:
                        idx = getattr(tc, "index", 0) or 0
                        slot = tool_buf.setdefault(
                            idx, {"id": "", "name": "", "arguments": ""}
                        )
                        tc_id = getattr(tc, "id", None)
                        if tc_id:
                            slot["id"] = tc_id
                        fn = getattr(tc, "function", None)
                        if fn is not None:
                            fname = getattr(fn, "name", None)
                            if fname:
                                slot["name"] = fname
                            fargs = getattr(fn, "arguments", None)
                            if fargs:
                                slot["arguments"] += fargs

            fr = getattr(choice, "finish_reason", None)
            if fr:
                finish_reason = fr

        if not tool_buf:
            return

        # Separate function tools (we dispatch) from server tools (provider
        # already executed them inline). The defensive name-based split
        # handles older litellm versions that surface server_tool_use as
        # regular tool_calls.
        ordered = sorted(tool_buf.items(), key=lambda kv: kv[0])
        function_calls: list[tuple[int, dict[str, str]]] = []
        server_calls: list[dict[str, str]] = []
        for idx, slot in ordered:
            if slot["name"] in TOOL_REGISTRY or slot["name"] in STREAMING_TOOLS:
                function_calls.append((idx, slot))
            elif slot["name"] in SERVER_TOOL_NAMES:
                server_calls.append(slot)
            else:
                # Unknown tool - treat as server (safer than dispatching).
                server_calls.append(slot)

        # Emit UX events for server tools (mobile chat shows the status).
        for slot in server_calls:
            try:
                args = json.loads(slot["arguments"] or "{}")
            except json.JSONDecodeError:
                args = {}
            yield ("tool_call", {"name": slot["name"], "args": args})
            yield ("tool_result", {"name": slot["name"], "preview": "server-side"})

        if not function_calls:
            # The model only used server tools; the provider already produced
            # the final response inline. No further loop iteration needed.
            return

        # Build the assistant turn with its (function) tool_calls.
        function_tool_calls_payload = []
        for idx, slot in function_calls:
            call_id = slot["id"] or f"call_{turn}_{idx}"
            function_tool_calls_payload.append(
                {
                    "id": call_id,
                    "type": "function",
                    "function": {
                        "name": slot["name"],
                        "arguments": slot["arguments"] or "{}",
                    },
                }
            )

        history.append(
            {
                "role": "assistant",
                "content": assistant_content or None,
                "tool_calls": function_tool_calls_payload,
            }
        )

        for tc in function_tool_calls_payload:
            name = tc["function"]["name"]
            args_str = tc["function"]["arguments"]
            try:
                args = json.loads(args_str) if args_str else {}
            except json.JSONDecodeError:
                args = {}

            yield ("tool_call", {"name": name, "args": args})

            if name in STREAMING_TOOLS:
                async for event_type, payload in _execute_specialist(account_id, args):
                    if event_type == "__result__":
                        result = payload
                    else:
                        yield (event_type, payload)
            else:
                result = await asyncio.to_thread(dispatch, account_id, name, args)

            preview = _preview(result)
            yield ("tool_result", {"name": name, "preview": preview})

            history.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result, default=str),
                }
            )

        if finish_reason and finish_reason not in ("tool_calls", "function_call"):
            return

    yield (
        "error",
        {"message": f"Max tool turns ({MAX_TOOL_TURNS}) reached without final answer."},
    )


async def _execute_specialist(
    account_id: str, args: dict[str, Any]
) -> AsyncIterator[tuple[str, dict[str, Any]]]:
    """Run a chat-triggered specialist (run_specialist). Spawns the agent named
    in args, forwards its progress events, persists the result by output_kind,
    then yields a final ('__result__', dict) the caller feeds back to the chat
    model as the tool result. Generic: a new specialist needs only a registry
    entry, no change here.
    """
    agent_name = args.get("agent")
    task = (args.get("task") or "").strip()
    reset = bool(args.get("reset"))
    spec = agents.AGENT_SPECS.get(agent_name) if agent_name else None

    if spec is None or not spec.chat_triggerable:
        yield ("__result__", {"error": f"Unbekannter Spezialist: {agent_name}"})
        return

    if reset and spec.output_kind == "training_plan":
        await asyncio.to_thread(db.archive_plans, account_id, ("draft",))

    # depth 1: the specialist level (the coach's run_specialist call is depth 0).
    yield ("status", {"label": f"{agent_name}-Agent arbeitet", "depth": 1, "agent": agent_name})

    queue: asyncio.Queue[tuple[str, ...]] = asyncio.Queue()

    async def on_event(event_type: str, payload: dict[str, Any]) -> None:
        await queue.put(("event", event_type, payload))

    async def run() -> None:
        try:
            out = await agents.spawn(
                agent_name, task or spec.default_task, account_id, on_event
            )
        except Exception as exc:
            logger.exception("specialist %s failed", agent_name)
            out = {"error": str(exc)}
        await queue.put(("done", out))

    runner = asyncio.create_task(run())
    out: dict[str, Any] | None = None
    while True:
        item = await queue.get()
        if item[0] == "done":
            out = item[1]  # type: ignore[assignment]
            break
        _, event_type, payload = item  # type: ignore[misc]
        yield (event_type, payload)
    await runner

    yield ("__result__", await _persist_specialist_result(account_id, spec, out))


async def _persist_specialist_result(
    account_id: str, spec: agents.AgentSpec, out: dict[str, Any] | None
) -> dict[str, Any]:
    """Turn a specialist's raw output into the chat tool result, persisting by
    output_kind. The db write is run off-thread (Supabase HTTP is blocking)."""
    if not out or "error" in out:
        return {"error": (out or {}).get("error", f"{spec.name} fehlgeschlagen")}

    if spec.output_kind == "training_plan":
        weeks = out.get("weeks", [])
        if not weeks:
            return {"error": "Plan-Generierung fehlgeschlagen"}
        row = await asyncio.to_thread(
            db.insert_plan, account_id, {"weeks": weeks}, out.get("rationale"), "draft"
        )
        return {
            "status": "plan_created",
            "plan_id": row.get("id"),
            "weeks": len(weeks),
            "rationale": out.get("rationale"),
        }

    # ephemeral: hand the raw output back to the chat model as the tool result.
    return {"status": "done", "agent": spec.name, "output": out}


def _preview(result: dict[str, Any]) -> str:
    """Short human-readable summary of a tool result for SSE clients."""
    if "error" in result:
        return f"error: {result['error']}"
    if result.get("status") == "plan_created":
        return f"plan draft created ({result.get('weeks', 0)} weeks)"
    if result.get("status") == "done" and "agent" in result:
        return f"{result['agent']} done"
    if "has_plan" in result:
        return "plan loaded" if result["has_plan"] else "no plan yet"
    if "onboarding_completed" in result:
        return f"onboarding done ({result.get('filled_sections', 0)} sections filled)"
    if "activities" in result:
        return f"{result.get('returned', len(result['activities']))} activities"
    if "metrics" in result:
        return f"{result.get('returned', len(result['metrics']))} days of metrics"
    if "sections" in result and "non_empty_sections" in result:
        return f"{len(result['non_empty_sections'])} sections filled"
    if "section" in result and result.get("status") == "ok":
        return f"updated {result['section']} ({result['stored_chars']} chars)"
    if "current" in result and "previous" in result:
        cur = result["current"]
        return (
            f"{cur.get('sessions', 0)} sessions, {cur.get('total_minutes', 0)} min, "
            f"{cur.get('total_km', 0)} km"
        )
    if "summary" in result:
        s = result["summary"]
        return f"{s.get('sport')} {s.get('duration_pretty')} {s.get('distance_km')}km"
    return "ok"


async def complete_chat(
    account_id: str,
    messages: list[ChatMessage],
    model: str | None = None,
) -> tuple[str, str]:
    """Non-streaming variant. No tool calling here, kept for /chat endpoint."""
    chosen_model = model or settings.chat_model
    history = _to_litellm_messages(account_id, messages)
    response = await litellm.acompletion(
        model=chosen_model,
        messages=history,
        stream=False,
    )
    content = response.choices[0].message.content or ""
    return content, chosen_model
