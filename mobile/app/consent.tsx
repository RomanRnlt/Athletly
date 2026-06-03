import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, HeartPulse, Cpu, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/use-auth';
import { useConsent } from '@/lib/consent-context';
import { Colors } from '@athletly/shared';

function Point({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  children: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="w-9 h-9 rounded-xl items-center justify-center bg-primary-light mt-0.5">
        <Icon size={18} color={Colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-text-primary text-base font-semibold mb-0.5">{title}</Text>
        <Text className="text-text-secondary text-sm leading-5">{children}</Text>
      </View>
    </View>
  );
}

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const { setConsent } = useConsent();
  const [loading, setLoading] = useState(false);

  const handleAgree = async () => {
    setLoading(true);
    try {
      await setConsent(true);
      // RoutingGate redirects to the app once consent flips to granted.
    } catch {
      Alert.alert('Fehler', 'Einwilligung konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Ohne Einwilligung',
      'Athletly kann ohne deine Einwilligung keine Gesundheitsdaten verarbeiten und dich nicht coachen. Du wirst abgemeldet.',
      [
        { text: 'Zurueck', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: () => signOut() },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={['#2563EB', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        <View className="mb-6">
          <ShieldCheck size={36} color="#FFFFFF" />
          <Text className="text-white text-3xl font-bold mt-3" style={{ letterSpacing: -0.5 }}>
            Deine Daten, deine Kontrolle
          </Text>
          <Text className="text-white/80 text-base mt-2">
            Bevor es losgeht, brauchen wir deine Einwilligung.
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
          <Point icon={HeartPulse} title="Gesundheits- und Trainingsdaten">
            Athletly verarbeitet deine Trainings- und Gesundheitsdaten (z.B. Herzfrequenz, HRV,
            Schlaf, Erholung), um dich individuell zu coachen. Das sind besondere Kategorien
            personenbezogener Daten nach Art. 9 DSGVO.
          </Point>

          <Point icon={Cpu} title="KI-Analyse (Anthropic, USA)">
            Fuer die Coaching-Analyse werden relevante Daten an unseren KI-Dienstleister Anthropic in
            den USA uebermittelt. Die Uebermittlung ist durch das EU-US Data Privacy Framework und
            einen Auftragsverarbeitungsvertrag abgesichert. Deine Daten werden nicht zum Training der
            KI-Modelle verwendet.
          </Point>

          <Point icon={Trash2} title="Jederzeit widerrufbar">
            Du kannst diese Einwilligung jederzeit in den Einstellungen widerrufen und deine Daten
            exportieren oder vollstaendig loeschen lassen.
          </Point>

          <View className="gap-3 mt-1">
            <Button
              variant="primary"
              size="lg"
              label="Zustimmen und loslegen"
              onPress={handleAgree}
              loading={loading}
              disabled={loading}
            />
            <Button
              variant="ghost"
              size="md"
              label="Nicht jetzt"
              onPress={handleDecline}
              disabled={loading}
            />
          </View>

          <Text className="text-text-muted text-xs text-center leading-4">
            Mit dem Tippen auf "Zustimmen" willigst du in die Verarbeitung deiner Gesundheitsdaten
            zur KI-gestuetzten Trainingsanalyse und die damit verbundene Uebermittlung in die USA ein.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
