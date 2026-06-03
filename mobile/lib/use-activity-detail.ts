// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';
import type { Activity } from './use-activities';

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
