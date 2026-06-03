'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/lib/use-garmin.ts.
import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, ApiError } from './api';
import { DEMO_MODE, DEMO_GARMIN_STATUS } from './demo';
import { useT } from '@/i18n';

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
  const t = useT();
  const [status, setStatus] = useState<GarminStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    if (DEMO_MODE) {
      setStatus(DEMO_GARMIN_STATUS);
      setIsLoading(false);
      return;
    }
    try {
      const result = await apiGet<GarminStatus>('/garmin/status');
      setStatus(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('garmin.statusLoadFailed');
      setError(message);
      setStatus(EMPTY_STATUS);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sync = useCallback(
    async (days?: number) => {
      setError(null);
      if (DEMO_MODE) {
        return {
          activities_synced: DEMO_GARMIN_STATUS.activity_count,
          daily_metrics_synced: 7,
          days: days ?? 7,
          last_sync_at: DEMO_GARMIN_STATUS.last_sync_at ?? new Date().toISOString(),
        };
      }
      setIsSyncing(true);
      try {
        const result = await apiPost<SyncResult>('/garmin/sync', days ? { days } : {});
        await refresh();
        return result;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t('garmin.syncFailed');
        setError(message);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [refresh, t],
  );

  const disconnect = useCallback(async () => {
    setError(null);
    if (DEMO_MODE) return; // friendly no-op: keep the connected demo state
    try {
      await apiDelete<{ status: string }>('/garmin/disconnect');
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('garmin.disconnectFailed');
      setError(message);
    }
  }, [refresh, t]);

  return { status, isLoading, isSyncing, error, refresh, sync, disconnect };
}
