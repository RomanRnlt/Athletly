"""Skill loader.

A "skill" is a markdown file under services/api/skills/. When the
relevant trigger fires (e.g. onboarding_completed == false), the agent
prepends the skill content to the chat system prompt. The discipline
matches Anthropic's Agent Skills pattern: SKILL.md with YAML
frontmatter + XML-tagged content, progressively disclosed only when
applicable.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"


@lru_cache(maxsize=16)
def load_skill(name: str) -> str:
    """Return the full skill markdown (frontmatter + body).

    Cached because the markdown is read-only at runtime; on disk edits
    require a server restart, which is fine for a deliberate skill change.
    """
    path = SKILLS_DIR / f"{name}.md"
    if not path.exists():
        logger.warning("Skill %s not found at %s", name, path)
        return ""
    return path.read_text(encoding="utf-8")
