// SPDX-License-Identifier: MIT
/**
 * Social sign-in (Google + Apple).
 *
 * Lazy-require the native SDKs INSIDE each function so importing this module
 * doesn't drag native code into Expo Go (where Apple/Google sign-in is not
 * available). The runtime call still resolves via Metro bundling, so Dev
 * Client and standalone builds work as usual.
 */

import { supabase } from './supabase';

const GOOGLE_WEB_CLIENT_ID =
  '98592586024-ei7gto3tat0q5dj417nh73flee7fomte.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '98592586024-k5s0mqd9g5qj4bm0h62u8anv0q7pq08g.apps.googleusercontent.com';

function normalizeModule(mod: Record<string, unknown>): Record<string, unknown> {
  const def = (mod as { default?: unknown }).default;
  if (def && typeof def === 'object') {
    return { ...(def as Record<string, unknown>), ...mod };
  }
  return mod;
}

export async function signInWithGoogle(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = normalizeModule(require('@react-native-google-signin/google-signin'));
  const GoogleSignin = (mod as { GoogleSignin: unknown }).GoogleSignin as {
    configure: (opts: Record<string, unknown>) => void;
    hasPlayServices?: (opts?: Record<string, unknown>) => Promise<boolean>;
    signIn: () => Promise<unknown>;
  };

  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    serverClientId: GOOGLE_WEB_CLIENT_ID,
  });

  if (typeof GoogleSignin.hasPlayServices === 'function') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = (await GoogleSignin.signIn()) as
    | { data?: { idToken?: unknown } | null; idToken?: unknown }
    | null;

  const idToken = (result?.data?.idToken ?? result?.idToken) as string | undefined;
  if (!idToken) {
    throw new Error('Google sign-in returned no idToken');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
}

export async function signInWithApple(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AppleAuth = normalizeModule(require('expo-apple-authentication')) as {
    AppleAuthenticationScope: { FULL_NAME: unknown; EMAIL: unknown };
    signInAsync: (opts: { requestedScopes: unknown[] }) => Promise<{
      identityToken?: unknown;
    } | null>;
  };
  const scopes = AppleAuth.AppleAuthenticationScope;
  const credential = await AppleAuth.signInAsync({
    requestedScopes: [scopes.FULL_NAME, scopes.EMAIL],
  });
  const idToken = credential?.identityToken as string | undefined;
  if (!idToken) {
    throw new Error('Apple sign-in returned no identityToken');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
  });
  if (error) throw error;
}
