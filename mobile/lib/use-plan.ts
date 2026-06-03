// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';
import { parseSession } from './plan-grammar';
import type { WeeklyPlan, DayPlan } from '@athletly/shared';

interface RawDay {
  date: string;
  sessions: unknown[];
  rest_reason?: string;
  completion?: number | null;
}

interface RawWeek {
  week_start: string;
  coach_message?: string;
  days: RawDay[];
}

interface PlanResponse {
  has_plan: boolean;
  status: string | null;
  plan_id: string | null;
  rationale: string | null;
  weeks: RawWeek[];
}

interface UsePlanReturn {
  weeks: WeeklyPlan[];
  status: string | null;
  rationale: string | null;
  hasPlan: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function mapWeek(w: RawWeek): WeeklyPlan {
  const days: DayPlan[] = (w.days ?? []).map((d) => ({
    date: d.date,
    sessions: (d.sessions ?? []).map((s, i) => parseSession(s, i, d.date)),
    rest_reason: d.rest_reason,
    completion: typeof d.completion === 'number' ? d.completion : null,
  }));
  return {
    weekStart: w.week_start,
    coachMessage: w.coach_message,
    days,
  };
}

export function usePlan(): UsePlanReturn {
  const [weeks, setWeeks] = useState<WeeklyPlan[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<PlanResponse>('/plan');
      setHasPlan(data.has_plan);
      setStatus(data.status);
      setRationale(data.rationale);
      setWeeks((data.weeks ?? []).map(mapWeek));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Plan konnte nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { weeks, status, rationale, hasPlan, isLoading, error, refresh };
}
