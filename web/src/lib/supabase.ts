'use client';
// SPDX-License-Identifier: MIT

// Web variant of mobile/lib/supabase.ts. Uses the browser's default storage
// (localStorage) instead of AsyncStorage, and reads NEXT_PUBLIC_* env vars
// mirroring the mobile EXPO_PUBLIC_* names. detectSessionInUrl is true so the
// OAuth redirect hash is consumed on the web.
import { createClient } from '@supabase/supabase-js';
import { DEMO_MODE } from './demo';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// In DEMO_MODE the app never reaches Supabase (auth is bypassed and every hook
// returns seed data), so missing env must NOT crash the build/prerender. Fall
// back to harmless placeholder values. Outside demo mode the env is required.
if (!DEMO_MODE && (!url || !anonKey)) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to web/.env.local',
  );
}

const effectiveUrl = url ?? 'https://demo.invalid.supabase.co';
const effectiveAnonKey = anonKey ?? 'demo-anon-key';

export const supabase = createClient(effectiveUrl, effectiveAnonKey, {
  auth: {
    autoRefreshToken: !DEMO_MODE,
    persistSession: !DEMO_MODE,
    detectSessionInUrl: !DEMO_MODE,
  },
});

/** Get the current access token or null. Used by api.ts to attach Bearer. */
export async function getAccessToken(): Promise<string | null> {
  // No real session exists in demo mode; never call out to Supabase.
  if (DEMO_MODE) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
