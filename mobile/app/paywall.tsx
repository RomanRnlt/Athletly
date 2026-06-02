import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Check, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/use-auth';
import {
  configurePurchases,
  getProOffering,
  isPurchasesAvailable,
  purchasePackage,
  restorePurchases,
  type ProOffering,
} from '@/lib/purchases';
import { Colors } from '@/lib/colors';

// Shown when RevenueCat has no live offering yet (e.g. Expo Go or store
// products not configured). The real prices come from RevenueCat once set up.
const FALLBACK_MONTHLY = '9,99 EUR';
const FALLBACK_ANNUAL = '69,99 EUR';

const BENEFITS = [
  'Deutlich mehr KI-Coaching pro Monat',
  'Unbegrenzte Trainingsplaene',
  'Tiefe Analysen deiner Gesundheitsdaten',
  'Frueher Zugang zu neuen Features',
];

function Benefit({ children }: { children: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-6 h-6 rounded-full items-center justify-center bg-primary-light">
        <Check size={14} color={Colors.primary} />
      </View>
      <Text className="text-text-secondary text-sm flex-1">{children}</Text>
    </View>
  );
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const [offering, setOffering] = useState<ProOffering | null>(null);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const accountId = session?.user?.id;
    if (!accountId) return;
    let mounted = true;
    (async () => {
      await configurePurchases(accountId);
      if (!mounted) return;
      setAvailable(isPurchasesAvailable());
      setOffering(await getProOffering());
    })();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const buy = async (pkg: unknown, fallbackLabel: string) => {
    if (!available || !pkg) {
      Alert.alert(
        'Noch nicht verfuegbar',
        'Kaeufe sind in dieser App-Version noch nicht aktiviert. Das wird mit dem naechsten Store-Build freigeschaltet.',
      );
      return;
    }
    setLoading(true);
    try {
      const ok = await purchasePackage(pkg);
      if (ok) {
        Alert.alert('Willkommen bei Pro', 'Dein Upgrade ist aktiv. Viel Spass beim Training!');
        router.back();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kauf fehlgeschlagen';
      // RevenueCat sets userCancelled on deliberate cancel; don't shout then.
      if (!/cancel/i.test(msg)) Alert.alert('Kauf fehlgeschlagen', msg);
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    setLoading(true);
    try {
      const ok = await restorePurchases();
      Alert.alert(
        ok ? 'Wiederhergestellt' : 'Nichts gefunden',
        ok ? 'Dein Pro-Zugang ist wieder aktiv.' : 'Keine aktiven Kaeufe gefunden.',
      );
      if (ok) router.back();
    } finally {
      setLoading(false);
    }
  };

  const monthlyPrice = offering?.monthlyPriceString ?? FALLBACK_MONTHLY;
  const annualPrice = offering?.annualPriceString ?? FALLBACK_ANNUAL;

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={['#2563EB', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        <View className="items-end">
          <Button variant="icon" size="sm" icon={X} onPress={() => router.back()} />
        </View>

        <View className="mb-6 mt-2">
          <Sparkles size={36} color="#FFFFFF" />
          <Text className="text-white text-3xl font-bold mt-3" style={{ letterSpacing: -0.5 }}>
            Athletly Pro
          </Text>
          <Text className="text-white/80 text-base mt-2">
            Mehr Coaching, mehr Plaene, mehr aus deinen Daten.
          </Text>
        </View>

        <View
          className="bg-white rounded-3xl p-6 gap-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <View className="gap-3">
            {BENEFITS.map((b) => (
              <Benefit key={b}>{b}</Benefit>
            ))}
          </View>

          <View className="gap-3 mt-1">
            <Button
              variant="primary"
              size="lg"
              label={`Jaehrlich - ${annualPrice}`}
              onPress={() => buy(offering?.annualPackage, annualPrice)}
              loading={loading}
              disabled={loading}
            />
            <Button
              variant="secondary"
              size="lg"
              label={`Monatlich - ${monthlyPrice}`}
              onPress={() => buy(offering?.monthlyPackage, monthlyPrice)}
              disabled={loading}
            />
            <Button
              variant="ghost"
              size="md"
              label="Kaeufe wiederherstellen"
              onPress={restore}
              disabled={loading}
            />
          </View>

          {!available && (
            <Text className="text-text-muted text-xs text-center leading-4">
              Kaeufe werden mit dem naechsten Store-Build aktiviert.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
