'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/lib/use-profile.ts.
import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';
import { DEMO_MODE, DEMO_PROFILE } from './demo';

export interface ProfileSection {
  name: string;
  content: string;
  empty: boolean;
}

interface ProfileResponse {
  sections: ProfileSection[];
  is_empty: boolean;
  onboarding_completed: boolean;
  filled_sections: number;
}

interface UseProfileReturn {
  sections: ProfileSection[];
  isEmpty: boolean;
  onboardingCompleted: boolean;
  filledSections: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAthleteProfile(): UseProfileReturn {
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [filledSections, setFilledSections] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    if (DEMO_MODE) {
      setSections([...DEMO_PROFILE.sections]);
      setIsEmpty(DEMO_PROFILE.is_empty);
      setOnboardingCompleted(DEMO_PROFILE.onboarding_completed);
      setFilledSections(DEMO_PROFILE.filled_sections);
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiGet<ProfileResponse>('/profile');
      setSections(data.sections);
      setIsEmpty(data.is_empty);
      setOnboardingCompleted(data.onboarding_completed);
      setFilledSections(data.filled_sections);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Profil konnte nicht geladen werden';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    sections,
    isEmpty,
    onboardingCompleted,
    filledSections,
    isLoading,
    error,
    refresh,
  };
}
