"""AthleteProfile stored as a sections jsonb in athlete_profiles.

The closed section skeleton lives in this module (SECTIONS), the content is
free prose per section, bounded at MAX_SECTION_CHARS. One row per account_id.
Reads and writes go through the service-role Supabase client; the caller is
the JWT-verified handler.
"""

from __future__ import annotations

import logging
from typing import Any

from .supabase_client import get_service_client

logger = logging.getLogger(__name__)


SECTIONS: tuple[str, ...] = (
    "Warum ich trainiere",
    "Sportarten & Rollen",
    "Nicht verhandelbar (Leben & Kontext)",
    "Wie ich auf Belastung reagiere",
    "Geschichte & Erfahrung",
    "Coaching-Stil & Praeferenzen",
)

MAX_SECTION_CHARS = 2000


def _truncate(content: str) -> str:
    if len(content) <= MAX_SECTION_CHARS:
        return content
    truncated = content[:MAX_SECTION_CHARS]
    last_space = truncated.rfind(" ")
    if last_space > MAX_SECTION_CHARS - 200:
        truncated = truncated[:last_space]
    return truncated.rstrip()


def _empty_sections() -> list[dict[str, str]]:
    return [{"name": name, "content": ""} for name in SECTIONS]


def _read_row(account_id: str) -> list[dict[str, str]]:
    sb = get_service_client()
    res = (
        sb.table("athlete_profiles")
        .select("sections")
        .eq("account_id", account_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return _empty_sections()
    raw = rows[0].get("sections") or []
    by_name: dict[str, str] = {}
    for entry in raw:
        if isinstance(entry, dict):
            name = entry.get("name")
            content = entry.get("content", "")
            if isinstance(name, str) and isinstance(content, str):
                by_name[name] = content
    return [{"name": name, "content": by_name.get(name, "")} for name in SECTIONS]


def _write_row(account_id: str, sections: list[dict[str, str]]) -> None:
    from datetime import datetime, timezone

    sb = get_service_client()
    sb.table("athlete_profiles").upsert(
        {
            "account_id": account_id,
            "sections": sections,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="account_id",
    ).execute()


def read_sections(account_id: str) -> dict[str, str]:
    return {s["name"]: s["content"] for s in _read_row(account_id)}


def read_sections_ordered(account_id: str) -> list[dict[str, str]]:
    """Sections in document order, including empty ones."""
    return _read_row(account_id)


def update_section(account_id: str, section: str, content: str) -> dict[str, str]:
    if section not in SECTIONS:
        raise ValueError(
            f"unknown section: {section!r}. Allowed: {', '.join(SECTIONS)}"
        )
    sections = _read_row(account_id)
    cleaned = _truncate(content.strip())
    sections = [
        {**s, "content": cleaned} if s["name"] == section else s
        for s in sections
    ]
    _write_row(account_id, sections)
    return {s["name"]: s["content"] for s in sections}


def reset(account_id: str) -> None:
    """Reset all sections to empty."""
    _write_row(account_id, _empty_sections())


def narrate_profile(account_id: str) -> str:
    """Render only non-empty sections for prompt injection."""
    blocks: list[str] = []
    for entry in _read_row(account_id):
        body = entry["content"].strip()
        if body:
            blocks.append(f"## {entry['name']}\n{body}")
    return "\n\n".join(blocks)
