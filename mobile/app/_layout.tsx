import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/lib/use-auth';
import { ConsentProvider, useConsent } from '@/lib/consent-context';
import { configurePurchases } from '@/lib/purchases';
import { Colors } from '@athletly/shared';

function Splash() {
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: Colors.background }}
    >
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

/**
 * Decides which top-level destination is allowed given auth + consent state.
 *
 * Order of gates:
 *   1. No session  -> only /login is reachable.
 *   2. Session but health-data consent missing/outdated -> force /consent.
 *   3. Session + consent OK -> keep users out of /login and /consent.
 */
function RoutingGate({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { status, isLoading } = useConsent();

  if (!session) {
    return pathname === '/login' ? <>{children}</> : <Redirect href="/login" />;
  }

  if (isLoading) return <Splash />;

  const needsConsent = status?.needsConsent ?? false;
  if (needsConsent && pathname !== '/consent') {
    return <Redirect href="/consent" />;
  }
  if (!needsConsent && (pathname === '/consent' || pathname === '/login')) {
    return <Redirect href="/(tabs)/plan" />;
  }

  return <>{children}</>;
}

function AuthGate() {
  const { session, isLoading } = useAuth();

  // Configure RevenueCat with the signed-in user's id as the app_user_id, so
  // purchases + the billing webhook map to this account. No-op until the
  // native module + SDK keys are present (see lib/purchases.ts).
  const accountId = session?.user?.id;
  useEffect(() => {
    if (accountId) configurePurchases(accountId);
  }, [accountId]);

  if (isLoading) return <Splash />;

  return (
    <ConsentProvider enabled={!!session}>
      <RoutingGate session={session}>
        <Stack screenOptions={{ headerShown: false }} />
      </RoutingGate>
    </ConsentProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthGate />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
