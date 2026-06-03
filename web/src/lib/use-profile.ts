'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/lib/use-profile.ts.
import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';
import { DEMO_MODE, buildDemoProfile } from './demo';
import { useI18n } from '@/i18n';

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
  const { t } = useI18n();
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [filledSections, setFilledSections] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    if (DEMO_MODE) {
      const demoProfile = buildDemoProfile(t);
      setSections([...demoProfile.sections]);
      setIsEmpty(demoProfile.is_empty);
      setOnboardingCompleted(demoProfile.onboarding_completed);
      setFilledSections(demoProfile.filled_sections);
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
      const message = err instanceof ApiError ? err.message : t('athleteProfile.loadFailed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
