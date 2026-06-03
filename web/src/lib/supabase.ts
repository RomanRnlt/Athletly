'use client';

// Web variant of mobile/lib/supabase.ts. Uses the browser's default storage
// (localStorage) instead of AsyncStorage, and reads NEXT_PUBLIC_* env vars
// mirroring the mobile EXPO_PUBLIC_* names. detectSessionInUrl is true so the
// OAuth redirect hash is consumed on the web.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to web/.env.local',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/** Get the current access token or null. Used by api.ts to attach Bearer. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
