'use client';
// SPDX-License-Identifier: MIT

// Web social sign-in. On the web there is no native Google/Apple SDK, so we use
// Supabase's OAuth redirect flow (signInWithOAuth). This replaces the mobile
// native-token flow in mobile/lib/social-auth.ts while keeping the same public
// function names so the login screen ports unchanged.
import { supabase } from './supabase';

function redirectTo(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo() },
  });
  if (error) throw error;
  // On success the browser is redirected to the provider; control does not
  // return here until Supabase sends the user back to the app origin.
}

export async function signInWithApple(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: redirectTo() },
  });
  if (error) throw error;
}
