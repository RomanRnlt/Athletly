'use client';

// Ported 1:1 from mobile/lib/use-activity-detail.ts.
import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';
import type { Activity } from './use-activities';
import { DEMO_MODE, DEMO_ACTIVITIES, DEMO_ACTIVITY_EXTRAS } from './demo';

interface ActivityDetailResponse {
  activity: Activity;
  extras: Record<string, number | string>;
}

interface UseActivityDetailReturn {
  activity: Activity | null;
  extras: Record<string, number | string>;
  isLoading: boolean;
  error: string | null;
}

export function useActivityDetail(id: string): UseActivityDetailReturn {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [extras, setExtras] = useState<Record<string, number | string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    if (DEMO_MODE) {
      const found = DEMO_ACTIVITIES.find((a) => a.garmin_activity_id === id) ?? null;
      setActivity(found);
      setExtras(found ? (DEMO_ACTIVITY_EXTRAS[found.garmin_activity_id] ?? {}) : {});
      if (!found) setError('Activity konnte nicht geladen werden');
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiGet<ActivityDetailResponse>(
        `/activities/${encodeURIComponent(id)}`,
      );
      setActivity(data.activity);
      setExtras(data.extras ?? {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Activity konnte nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { activity, extras, isLoading, error };
}
