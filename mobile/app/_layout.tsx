import '../global.css';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/use-auth';
import { Colors } from '@/lib/colors';

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

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) return <Splash />;

  if (!session && pathname !== '/login') {
    return <Redirect href="/login" />;
  }
  if (session && pathname === '/login') {
    return <Redirect href="/(tabs)/plan" />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
