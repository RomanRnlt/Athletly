import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';

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
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await apiGet<MetricsListResponse>(`/metrics?days=${days}`);
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gesundheitsdaten konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, isLoading, error, refresh };
}
