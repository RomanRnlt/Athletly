import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';

export interface Activity {
  garmin_activity_id: string;
  sport: string | null;
  start_time: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  training_effect: number | null;
  avg_pace_min_km: number | null;
  elevation_gain_m: number | null;
}

interface ActivityListResponse {
  activities: Activity[];
  sports: string[];
  returned: number;
}

interface UseActivitiesReturn {
  activities: Activity[];
  sports: string[];
  isLoading: boolean;
  error: string | null;
  sportFilter: string | null;
  setSportFilter: (sport: string | null) => void;
  refresh: () => Promise<void>;
}

export function useActivities(): UseActivitiesReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  const load = useCallback(async (sport: string | null) => {
    setError(null);
    setIsLoading(true);
    try {
      const qs = sport ? `?sport=${encodeURIComponent(sport)}&limit=200` : '?limit=200';
      const data = await apiGet<ActivityListResponse>(`/activities${qs}`);
      setActivities(data.activities);
      // Keep the full sport set stable even when a filter is active.
      if (!sport) setSports(data.sports);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Aktivitaeten konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sportFilter);
  }, [load, sportFilter]);

  const refresh = useCallback(() => load(sportFilter), [load, sportFilter]);

  return {
    activities,
    sports,
    isLoading,
    error,
    sportFilter,
    setSportFilter,
    refresh,
  };
}
