# SPDX-License-Identifier: MIT
"""AI usage metering: per-request token meter, credit gate, and accounting.

Credits are the user-facing unit. A chat message costs `credit_cost_chat`, a
plan generation costs `credit_cost_plan` (it is far more expensive: it spawns
sub-agents). Real token counts and USD cost are logged alongside for cost
observability and for tuning the credit costs later against actual spend.

The meter is a per-request object held in a ContextVar. Because
`asyncio.create_task` copies the context, spawned sub-agents see the SAME meter
instance by reference and their token usage accumulates into it. Call sites only
need to `add_response()` / `mark_plan()`; the request handler `start()`s the
meter up front and `charge()`s it once the work is done.
"""

from __future__ import annotations

import contextvars
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from .config import settings
from .supabase_client import get_service_client

logger = logging.getLogger(__name__)

# Unlimited tiers map to None (no limit). Everything else reads from config so
# the numbers are tunable without a deploy.
_UNLIMITED = None


def limit_for_tier(tier: str) -> int | None:
    if tier == "grandfather":
        return _UNLIMITED
    if tier == "pro":
        return settings.credits_pro
    return settings.credits_free


def period_start(now: datetime | None = None) -> datetime:
    """Start of the current calendar month in UTC (the monthly reset boundary)."""
    now = now or datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def next_reset(now: datetime | None = None) -> datetime:
    """Start of next calendar month in UTC."""
    now = now or datetime.now(timezone.utc)
    if now.month == 12:
        return now.replace(
            year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )
    return now.replace(
        month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0
    )


# ---------------------------------------------------------------------------
# Per-request meter (ContextVar)
# ---------------------------------------------------------------------------


@dataclass
class Meter:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cached_tokens: int = 0
    cost_usd: float = 0.0
    llm_calls: int = 0
    plan_generated: bool = False
    models: set[str] = field(default_factory=set)


_current: contextvars.ContextVar[Meter | None] = contextvars.ContextVar(
    "usage_meter", default=None
)


def start() -> Meter:
    meter = Meter()
    _current.set(meter)
    return meter


def current() -> Meter | None:
    return _current.get()


def mark_plan() -> None:
    meter = current()
    if meter is not None:
        meter.plan_generated = True


def _extract_usage(response: Any) -> tuple[int, int, int]:
    """Return (prompt, completion, cached) tokens from a litellm response or
    streaming chunk. Robust to missing fields across providers."""
    usage = getattr(response, "usage", None)
    if usage is None and isinstance(response, dict):
        usage = response.get("usage")
    if usage is None:
        return 0, 0, 0

    def _get(obj: Any, key: str) -> int:
        val = getattr(obj, key, None)
        if val is None and isinstance(obj, dict):
            val = obj.get(key)
        try:
            return int(val or 0)
        except (TypeError, ValueError):
            return 0

    prompt = _get(usage, "prompt_tokens")
    completion = _get(usage, "completion_tokens")
    # litellm surfaces Anthropic cache reads under prompt_tokens_details.
    cached = 0
    details = getattr(usage, "prompt_tokens_details", None)
    if details is None and isinstance(usage, dict):
        details = usage.get("prompt_tokens_details")
    if details is not None:
        cached = _get(details, "cached_tokens")
    return prompt, completion, cached


def add_response(response: Any, model: str | None = None) -> None:
    """Accumulate one completion's usage into the current request meter."""
    meter = current()
    if meter is None:
        return
    prompt, completion, cached = _extract_usage(response)
    meter.prompt_tokens += prompt
    meter.completion_tokens += completion
    meter.cached_tokens += cached
    meter.llm_calls += 1
    if model:
        meter.models.add(model)

    # Best-effort cost; never let pricing lookups break a request.
    try:
        import litellm

        cost = litellm.completion_cost(completion_response=response)
        if cost:
            meter.cost_usd += float(cost)
    except Exception:
        logger.debug("completion_cost failed for model=%s", model, exc_info=True)


# ---------------------------------------------------------------------------
# Tier + gate
# ---------------------------------------------------------------------------


def get_tier(account_id: str) -> str:
    sb = get_service_client()
    res = (
        sb.table("account_billing")
        .select("tier")
        .eq("account_id", account_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0]["tier"] if rows else "free"


def credits_used(account_id: str) -> int:
    sb = get_service_client()
    res = sb.rpc(
        "credits_used_since",
        {"p_account_id": account_id, "p_since": period_start().isoformat()},
    ).execute()
    data = res.data
    try:
        return int(data or 0)
    except (TypeError, ValueError):
        return 0


def is_allowed(account_id: str) -> bool:
    """True when the account still has credits this period (or is unlimited).

    Pre-check only: because real token cost is known after the call, an account
    can overshoot by at most one action. That is intentional and standard.
    """
    limit = limit_for_tier(get_tier(account_id))
    if limit is None:
        return True
    return credits_used(account_id) < limit


def summary(account_id: str) -> dict[str, Any]:
    tier = get_tier(account_id)
    limit = limit_for_tier(tier)
    used = credits_used(account_id)
    return {
        "tier": tier,
        "used": used,
        "limit": limit,  # None => unlimited
        "remaining": None if limit is None else max(0, limit - used),
        "resets_at": next_reset().isoformat(),
        "cost_chat": settings.credit_cost_chat,
        "cost_plan": settings.credit_cost_plan,
    }


# ---------------------------------------------------------------------------
# Charge (record the event after the work is done)
# ---------------------------------------------------------------------------


def charge(account_id: str, *, meter: Meter | None = None) -> dict[str, Any]:
    """Record one usage event for the finished request and return its summary.

    Credits are flat per action: plan if a plan was generated this request, else
    chat. Token/cost figures come from the accumulated meter.
    """
    meter = meter or current()
    if meter is None:
        meter = Meter()

    # Nothing actually hit the LLM (e.g. the request errored before any call):
    # do not charge or log a phantom event.
    if meter.llm_calls == 0:
        return summary(account_id)

    kind = "plan" if meter.plan_generated else "chat"
    credits = (
        settings.credit_cost_plan if meter.plan_generated else settings.credit_cost_chat
    )

    sb = get_service_client()
    try:
        sb.table("ai_usage_events").insert(
            {
                "account_id": account_id,
                "kind": kind,
                "model": ", ".join(sorted(meter.models)) or None,
                "prompt_tokens": meter.prompt_tokens,
                "completion_tokens": meter.completion_tokens,
                "cached_tokens": meter.cached_tokens,
                "credits": credits,
                "cost_usd": round(meter.cost_usd, 6) if meter.cost_usd else None,
            }
        ).execute()
    except Exception:
        # Never fail the user's request because accounting failed; log and move on.
        logger.exception("Failed to record usage event for %s", account_id)

    logger.info(
        "usage[%s] kind=%s credits=%s tokens=%d/%d cached=%d calls=%d cost=$%.4f",
        account_id,
        kind,
        credits,
        meter.prompt_tokens,
        meter.completion_tokens,
        meter.cached_tokens,
        meter.llm_calls,
        meter.cost_usd,
    )
    return summary(account_id)
