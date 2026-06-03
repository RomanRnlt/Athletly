'use client';
// SPDX-License-Identifier: MIT

/**
 * Web equivalent of mobile/app/_layout.tsx. Reproduces the same gating:
 *   1. No session            -> only /login is reachable.
 *   2. Session, needs consent -> force /consent.
 *   3. Session + consent OK   -> keep users out of /login and /consent.
 *
 * Navigation uses the Next.js router instead of expo-router's <Redirect>.
 */
import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/lib/use-auth';
import { ConsentProvider, useConsent } from '@/lib/consent-context';
import { Colors } from '@athletly/shared';
import { DEMO_MODE } from '@/lib/demo';
import { useT } from '@/i18n';

function Splash() {
  const t = useT();
  return (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: Colors.background }}>
      <span
        className="inline-block h-9 w-9 rounded-full border-4 border-transparent animate-spin"
        style={{ borderTopColor: Colors.primary, borderRightColor: Colors.primary }}
        aria-label={t('common.loading')}
      />
    </div>
  );
}

function RoutingGate({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, isLoading } = useConsent();

  const needsConsent = status?.needsConsent ?? false;

  useEffect(() => {
    if (!session) {
      if (pathname !== '/login') router.replace('/login');
      return;
    }
    if (isLoading) return;
    if (needsConsent && pathname !== '/consent') {
      router.replace('/consent');
      return;
    }
    if (!needsConsent && (pathname === '/consent' || pathname === '/login')) {
      router.replace('/plan');
    }
  }, [session, isLoading, needsConsent, pathname, router]);

  // Render gates: avoid flashing protected content during a pending redirect.
  if (!session) {
    return pathname === '/login' ? <>{children}</> : <Splash />;
  }
  if (isLoading) return <Splash />;
  if (needsConsent && pathname !== '/consent') return <Splash />;
  if (!needsConsent && (pathname === '/consent' || pathname === '/login')) return <Splash />;

  return <>{children}</>;
}

/**
 * DEMO_MODE shell: skip all auth/consent gating and render the app as a
 * logged-in, consented user. Bounce /login and /consent to /plan so the
 * showcase always lands on the plan view.
 */
function DemoGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/login' || pathname === '/consent') {
      router.replace('/plan');
    }
  }, [pathname, router]);

  if (pathname === '/login' || pathname === '/consent') return <Splash />;
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (DEMO_MODE) {
    // ConsentProvider with enabled=false short-circuits (no API call) and
    // satisfies useConsent() for any component that reads it.
    return (
      <ConsentProvider enabled={false}>
        <DemoGate>{children}</DemoGate>
      </ConsentProvider>
    );
  }

  return <RealProviders>{children}</RealProviders>;
}

function RealProviders({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();

  if (isLoading) return <Splash />;

  return (
    <ConsentProvider enabled={!!session}>
      <RoutingGate session={session}>{children}</RoutingGate>
    </ConsentProvider>
  );
}
