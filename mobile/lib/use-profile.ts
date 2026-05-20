import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from './api';

export interface ProfileSection {
  name: string;
  content: string;
  empty: boolean;
}

interface ProfileResponse {
  sections: ProfileSection[];
  is_empty: boolean;
}

interface UseProfileReturn {
  sections: ProfileSection[];
  isEmpty: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAthleteProfile(): UseProfileReturn {
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<ProfileResponse>('/profile');
      setSections(data.sections);
      setIsEmpty(data.is_empty);
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

  return { sections, isEmpty, isLoading, error, refresh };
}
