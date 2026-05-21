from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_FILE)


def _normalize_model(raw: str) -> str:
    """Normalize legacy `provider:model` form to litellm `provider/model`."""
    raw = raw.strip()
    if ":" in raw and "/" not in raw:
        provider, model = raw.split(":", 1)
        return f"{provider}/{model}"
    return raw


@dataclass(frozen=True)
class Settings:
    chat_model: str
    plan_model: str
    anthropic_api_key: str | None
    gemini_api_key: str | None
    host: str
    port: int
    log_level: str
    cors_origins: list[str]
    supabase_url: str | None
    supabase_anon_key: str | None
    supabase_service_role_key: str | None


def _parse_origins(raw: str) -> list[str]:
    stripped = raw.strip()
    if not stripped or stripped == "*":
        return ["*"]
    return [o.strip() for o in stripped.split(",") if o.strip()]


def load_settings() -> Settings:
    return Settings(
        chat_model=_normalize_model(
            os.getenv("ATHLETLY_CHAT_MODEL", "anthropic/claude-sonnet-4-5"),
        ),
        plan_model=_normalize_model(
            os.getenv("ATHLETLY_PLAN_MODEL", "anthropic/claude-opus-4-7"),
        ),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY") or None,
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        log_level=os.getenv("LOG_LEVEL", "info"),
        cors_origins=_parse_origins(os.getenv("CORS_ORIGINS", "*")),
        supabase_url=os.getenv("SUPABASE_URL") or None,
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY") or None,
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or None,
    )


settings = load_settings()
