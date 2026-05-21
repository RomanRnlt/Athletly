"""Skill loader + discovery (Agent Skills standard, agentskills.io).

A skill is a DIRECTORY ``skills/<name>/SKILL.md`` with YAML frontmatter
(``name`` + ``description`` + ``allowed-tools`` + a ``metadata.athletly`` block)
and a Markdown/XML body, optionally carrying ``scripts/`` and ``references/``.

Frontmatter parsing and the directory scan are ported from NousResearch's
hermes-agent (``agent/skill_utils.py``) and trimmed to what we need: no runtime
skill authoring, no inline-shell execution, one skills directory. The frontmatter
is the single source the agent registry (``agents.py``) is built from.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"

# Tokens a SKILL.md body can use to reference its own folder (for scripts/refs).
_TEMPLATE_RE = re.compile(r"\$\{(SKILL_DIR)\}")


# ---------------------------------------------------------------------------
# Frontmatter parsing (ported from hermes-agent agent/skill_utils.py)
# ---------------------------------------------------------------------------


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from a markdown string.

    Returns ``(frontmatter_dict, body)``. Falls back to naive key:value
    splitting if the YAML is malformed, so one bad skill never breaks the scan.
    """
    frontmatter: dict[str, Any] = {}
    if not content.startswith("---"):
        return frontmatter, content

    end_match = re.search(r"\n---\s*\n", content[3:])
    if not end_match:
        return frontmatter, content

    yaml_content = content[3 : end_match.start() + 3]
    body = content[end_match.end() + 3 :]

    try:
        import yaml

        loader = getattr(yaml, "CSafeLoader", None) or yaml.SafeLoader
        parsed = yaml.load(yaml_content, Loader=loader)
        if isinstance(parsed, dict):
            frontmatter = parsed
    except Exception:
        for line in yaml_content.strip().split("\n"):
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            frontmatter[key.strip()] = value.strip()

    return frontmatter, body


def iter_skill_index_files(skills_dir: Path, filename: str = "SKILL.md"):
    """Walk ``skills_dir`` yielding sorted paths matching ``filename``."""
    matches: list[Path] = []
    for root, dirs, files in os.walk(skills_dir, followlinks=True):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        if filename in files:
            matches.append(Path(root) / filename)
    for path in sorted(matches, key=lambda p: str(p.relative_to(skills_dir))):
        yield path


def _athletly_meta(frontmatter: dict[str, Any]) -> dict[str, Any]:
    """Return the ``metadata.athletly`` block (always a dict)."""
    metadata = frontmatter.get("metadata")
    if not isinstance(metadata, dict):
        return {}
    block = metadata.get("athletly")
    return block if isinstance(block, dict) else {}


# ---------------------------------------------------------------------------
# Parsed skill model + scan
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ParsedSkill:
    name: str
    description: str
    frontmatter: dict[str, Any]
    body: str
    directory: Path

    @property
    def athletly(self) -> dict[str, Any]:
        return _athletly_meta(self.frontmatter)


@lru_cache(maxsize=1)
def scan_skills() -> dict[str, ParsedSkill]:
    """Scan SKILLS_DIR once, returning {name -> ParsedSkill}.

    Cached: skills are read-only at runtime; a deliberate skill change needs a
    server restart (same discipline as before). The skill ``name`` must match
    its directory name (Agent Skills rule); we warn and trust the dir name on
    mismatch.
    """
    skills: dict[str, ParsedSkill] = {}
    if not SKILLS_DIR.is_dir():
        logger.warning("Skills dir not found: %s", SKILLS_DIR)
        return skills

    for path in iter_skill_index_files(SKILLS_DIR):
        try:
            raw = path.read_text(encoding="utf-8")
        except Exception as exc:
            logger.warning("Could not read skill %s: %s", path, exc)
            continue
        frontmatter, body = parse_frontmatter(raw)
        dir_name = path.parent.name
        name = str(frontmatter.get("name") or dir_name)
        if name != dir_name:
            logger.warning(
                "Skill name '%s' != dir '%s' in %s; using dir name", name, dir_name, path
            )
            name = dir_name
        skills[name] = ParsedSkill(
            name=name,
            description=str(frontmatter.get("description", "")).strip(),
            frontmatter=frontmatter,
            body=body.strip(),
            directory=path.parent,
        )
    logger.info("Loaded %d skills: %s", len(skills), ", ".join(sorted(skills)))
    return skills


def get_skill(name: str) -> ParsedSkill | None:
    return scan_skills().get(name)


def inline_skills() -> list[ParsedSkill]:
    """Skills with ``activation: inline`` - injected into the chat prompt by code
    on a deterministic condition, not discovered/spawned by the model."""
    return [s for s in scan_skills().values() if s.athletly.get("activation") == "inline"]


def load_skill(name: str) -> str:
    """Return a skill's body (frontmatter stripped), ready to use as a system
    prompt. ``${SKILL_DIR}`` is substituted with the skill's folder so the body
    can point at its own scripts/references. Empty string if not found."""
    skill = scan_skills().get(name)
    if skill is None:
        logger.warning("Skill %s not found", name)
        return ""
    return _TEMPLATE_RE.sub(str(skill.directory), skill.body)
