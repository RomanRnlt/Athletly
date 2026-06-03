'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/lib/use-metrics.ts.
import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';
import { DEMO_MODE, DEMO_METRICS } from './demo';
import { useT } from '@/i18n';

export interface DailyMetric {
  date: string;
  resting_heart_rate: number | null;
  hrv_avg: number | null;
  sleep_score: number | null;
  sleep_duration_minutes: number | null;
  sleep_deep_minutes: number | null;
  sleep_light_minutes: number | null;
  sleep_rem_minutes: number | null;
  sleep_awake_minutes: number | null;
  stress_avg: number | null;
  body_battery_high: number | null;
  body_battery_low: number | null;
  recovery_score: number | null;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  vo2max: number | null;
  intensity_minutes: number | null;
  spo2_avg: number | null;
  respiration_avg: number | null;
}

interface MetricsListResponse {
  metrics: DailyMetric[];
  returned: number;
}

interface UseMetricsReturn {
  metrics: DailyMetric[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMetrics(days = 30): UseMetricsReturn {
  const t = useT();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    if (DEMO_MODE) {
      setMetrics(DEMO_METRICS.slice(0, days));
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiGet<MetricsListResponse>(`/metrics?days=${days}`);
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('syncedData.loadFailedMetrics'));
    } finally {
      setIsLoading(false);
    }
  }, [days, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, isLoading, error, refresh };
}
