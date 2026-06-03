// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, ApiError } from './api';

export interface GarminStatus {
  connected: boolean;
  display_name: string | null;
  email: string | null;
  connected_since: string | null;
  last_sync_at: string | null;
  activity_count: number;
  latest_activity_date: string | null;
}

interface SyncResult {
  activities_synced: number;
  daily_metrics_synced: number;
  days: number;
  last_sync_at: string;
}

interface UseGarminReturn {
  status: GarminStatus | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sync: (days?: number) => Promise<SyncResult | null>;
  disconnect: () => Promise<void>;
}

const EMPTY_STATUS: GarminStatus = {
  connected: false,
  display_name: null,
  email: null,
  connected_since: null,
  last_sync_at: null,
  activity_count: 0,
  latest_activity_date: null,
};

export function useGarmin(): UseGarminReturn {
  const [status, setStatus] = useState<GarminStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await apiGet<GarminStatus>('/garmin/status');
      setStatus(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Status konnte nicht geladen werden';
      setError(message);
      setStatus(EMPTY_STATUS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sync = useCallback(
    async (days?: number) => {
      setError(null);
      setIsSyncing(true);
      try {
        const result = await apiPost<SyncResult>('/garmin/sync', days ? { days } : {});
        await refresh();
        return result;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Sync fehlgeschlagen';
        setError(message);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [refresh],
  );

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await apiDelete<{ status: string }>('/garmin/disconnect');
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Trennen fehlgeschlagen';
      setError(message);
    }
  }, [refresh]);

  return { status, isLoading, isSyncing, error, refresh, sync, disconnect };
}
