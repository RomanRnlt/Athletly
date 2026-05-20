"""AthleteProfile: file-based markdown skeleton, agent-curated.

Conceptually the CLAUDE.md analog for the athlete: a single markdown file
the agent reads on every chat turn and writes to via the curation tools.
Roman can also edit it directly - the file is the source of truth, no
in-memory cache, every read hits disk.

Closed section skeleton (Agent erfindet keine neuen Sections), free content
per section, bounded at MAX_SECTION_CHARS. Curation discipline (lean MVP):
overwrite-not-append, per-section budget, no protected-anchor / unconfirmed
flow yet.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from . import db

PROFILE_PATH = db.DATA_DIR / "athlete.md"

# Closed section skeleton. Order = document order.
SECTIONS: tuple[str, ...] = (
    "Warum ich trainiere",
    "Sportarten & Rollen",
    "Nicht verhandelbar (Leben & Kontext)",
    "Wie ich auf Belastung reagiere",
    "Geschichte & Erfahrung",
    "Coaching-Stil & Praeferenzen",
)

MAX_SECTION_CHARS = 2000

_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)


@dataclass(frozen=True)
class ProfileSection:
    name: str
    content: str


def _empty_skeleton() -> str:
    """Render the empty profile with all section headings but no content."""
    blocks = ["# Athlete Profile", ""]
    for s in SECTIONS:
        blocks.append(f"## {s}")
        blocks.append("")
    return "\n".join(blocks).rstrip() + "\n"


def _ensure_file() -> None:
    if PROFILE_PATH.exists():
        return
    PROFILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROFILE_PATH.write_text(_empty_skeleton(), encoding="utf-8")


def read_raw() -> str:
    _ensure_file()
    return PROFILE_PATH.read_text(encoding="utf-8")


def parse_sections(md: str) -> dict[str, str]:
    """Return {section_name: content} for the known SECTIONS in *md*.

    Unknown headings are ignored. Missing sections come back as empty string.
    Robust against an athlete-edited file that has slight whitespace drift.
    """
    matches = list(_HEADING_RE.finditer(md))
    found: dict[str, str] = {}
    for i, m in enumerate(matches):
        name = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        content = md[start:end].strip()
        found[name] = content

    return {s: found.get(s, "") for s in SECTIONS}


def read_sections() -> dict[str, str]:
    return parse_sections(read_raw())


def _truncate(content: str) -> str:
    if len(content) <= MAX_SECTION_CHARS:
        return content
    truncated = content[:MAX_SECTION_CHARS]
    last_space = truncated.rfind(" ")
    if last_space > MAX_SECTION_CHARS - 200:
        truncated = truncated[:last_space]
    return truncated.rstrip()


def _render(sections: dict[str, str]) -> str:
    blocks = ["# Athlete Profile", ""]
    for s in SECTIONS:
        blocks.append(f"## {s}")
        body = sections.get(s, "").strip()
        if body:
            blocks.append(body)
        blocks.append("")
    return "\n".join(blocks).rstrip() + "\n"


def update_section(section: str, content: str) -> dict[str, str]:
    """Overwrite *section* with *content* (truncated to budget).

    Raises ValueError when section is not in the skeleton. Returns the
    updated section map so the caller can show what is now in the file.
    """
    if section not in SECTIONS:
        raise ValueError(
            f"unknown section: {section!r}. Allowed: {', '.join(SECTIONS)}"
        )
    sections = read_sections()
    sections[section] = _truncate(content.strip())
    PROFILE_PATH.write_text(_render(sections), encoding="utf-8")
    return sections


def reset() -> None:
    """Erase the athlete.md content back to the empty section skeleton.

    Used by the account-reset flow: profile is wiped but the file shape
    (six section headings) is restored so the next chat turn sees a
    consistent skeleton, not a missing file.
    """
    PROFILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROFILE_PATH.write_text(_empty_skeleton(), encoding="utf-8")


def narrate_profile() -> str:
    """Render only non-empty sections for prompt injection.

    A brand-new athlete (all sections empty) yields "" so the prompt builder
    can omit the identity block cleanly instead of feeding an empty skeleton
    as if it were knowledge.
    """
    sections = read_sections()
    blocks: list[str] = []
    for s in SECTIONS:
        body = sections.get(s, "").strip()
        if body:
            blocks.append(f"## {s}\n{body}")
    return "\n\n".join(blocks)
