from __future__ import annotations

import os
from collections.abc import AsyncIterator

import litellm

from .config import settings
from .schemas import ChatMessage

SYSTEM_PROMPT = """Du bist Ohm, der Coach der Athletly App. Du sprichst Roman direkt
und auf Augenhoehe an, kein Marketing-Sprech. Du bist warm aber praezise.

Verhalten:
- Antworte auf Deutsch, ausser Roman wechselt die Sprache.
- Halte Antworten kurz wenn die Frage kurz ist. Lieber ein Satz als ein Absatz.
- Wenn Trainingsfragen kommen: konkrete Zahlen, klare Empfehlung, einen Grund dazu.
- Wenn du etwas nicht weisst, sag es. Erfinde keine Pace-Werte oder HF-Zonen.
- Stell maximal eine Rueckfrage am Stueck.

Stil:
- Keine Emojis ausser Roman benutzt sie zuerst.
- Keine Aufzaehlungen mit Bullet-Points wenn 1-2 Saetze reichen.
- Du schreibst nie "Em-Dashes" oder Bindestrich-Gedankenstriche, nur normale Bindestriche.
"""


def _configure_provider_keys() -> None:
    """Litellm reads provider keys from env. Ensure they are set if available."""
    if settings.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
    if settings.gemini_api_key:
        os.environ.setdefault("GEMINI_API_KEY", settings.gemini_api_key)


_configure_provider_keys()


def _to_litellm_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
    history: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in messages:
        history.append({"role": m.role, "content": m.content})
    return history


async def stream_chat(
    messages: list[ChatMessage],
    model: str | None = None,
) -> AsyncIterator[str]:
    """Yield content deltas as they arrive from the LLM via litellm."""
    chosen_model = model or settings.chat_model
    history = _to_litellm_messages(messages)

    response = await litellm.acompletion(
        model=chosen_model,
        messages=history,
        stream=True,
    )

    async for chunk in response:
        choice = chunk.choices[0] if chunk.choices else None
        if choice is None:
            continue
        delta = getattr(choice, "delta", None)
        if delta is None:
            continue
        content = getattr(delta, "content", None)
        if content:
            yield content


async def complete_chat(
    messages: list[ChatMessage],
    model: str | None = None,
) -> tuple[str, str]:
    """Non-streaming variant. Returns (content, model_used)."""
    chosen_model = model or settings.chat_model
    history = _to_litellm_messages(messages)

    response = await litellm.acompletion(
        model=chosen_model,
        messages=history,
        stream=False,
    )

    content = response.choices[0].message.content or ""
    return content, chosen_model
