// SPDX-License-Identifier: MIT
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from './api';

export interface ConsentStatus {
  granted: boolean;
  needsConsent: boolean;
  version: string | null;
  currentVersion: string;
}

interface RawConsent {
  granted: boolean;
  needs_consent: boolean;
  version: string | null;
  current_version: string;
}

interface ConsentContextValue {
  status: ConsentStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setConsent: (granted: boolean) => Promise<void>;
}

function fromRaw(d: RawConsent): ConsentStatus {
  return {
    granted: d.granted,
    needsConsent: d.needs_consent,
    version: d.version,
    currentVersion: d.current_version,
  };
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

/**
 * Provides the user's health-data consent state to the whole tree. Only
 * fetches when `enabled` (i.e. there is an authenticated session); otherwise
 * it stays idle so logged-out users never hit the API.
 */
export function ConsentProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStatus(null);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const d = await apiGet<RawConsent>('/account/consent');
      setStatus(fromRaw(d));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Einwilligungsstatus konnte nicht geladen werden',
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const setConsent = useCallback(async (granted: boolean) => {
    const d = await apiPost<RawConsent>('/account/consent', { granted });
    setStatus(fromRaw(d));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    refresh();
  }, [refresh]);

  return (
    <ConsentContext.Provider value={{ status, isLoading, error, refresh, setConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return ctx;
}
