// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';

export interface UsageSummary {
  tier: 'free' | 'pro' | 'grandfather';
  used: number;
  limit: number | null; // null => unlimited
  remaining: number | null;
  resetsAt: string;
  costChat: number;
  costPlan: number;
}

interface RawUsage {
  tier: UsageSummary['tier'];
  used: number;
  limit: number | null;
  remaining: number | null;
  resets_at: string;
  cost_chat: number;
  cost_plan: number;
}

function fromRaw(d: RawUsage): UsageSummary {
  return {
    tier: d.tier,
    used: d.used,
    limit: d.limit,
    remaining: d.remaining,
    resetsAt: d.resets_at,
    costChat: d.cost_chat,
    costPlan: d.cost_plan,
  };
}

interface UseUsageReturn {
  usage: UsageSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** True when a limited tier has no credits left. */
  exhausted: boolean;
}

export function useUsage(): UseUsageReturn {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const d = await apiGet<RawUsage>('/account/usage');
      setUsage(fromRaw(d));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nutzung konnte nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const exhausted =
    usage != null && usage.limit != null && usage.remaining != null && usage.remaining <= 0;

  return { usage, isLoading, error, refresh, exhausted };
}
