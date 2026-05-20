import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  Bell,
  Globe,
  HelpCircle,
  Heart,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ServiceStatus } from '@/components/profile/ServiceStatus';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { GarminConnectModal } from '@/components/profile/GarminConnectModal';
import { useGarmin } from '@/lib/use-garmin';
import { apiPost, ApiError } from '@/lib/api';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide px-4 mb-2 mt-4">
      {children}
    </Text>
  );
}

function formatRelative(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'Gerade eben';
  if (min < 60) return `Vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `Vor ${d} Tag${d > 1 ? 'en' : ''}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { status, isSyncing, error, refresh, sync, disconnect } = useGarmin();
  const [modalVisible, setModalVisible] = useState(false);

  const handleConnectSuccess = async () => {
    setModalVisible(false);
    await refresh();
  };

  const handleSync = async () => {
    const result = await sync();
    if (result) {
      Alert.alert(
        'Sync abgeschlossen',
        `${result.activities_synced} Aktivitaeten und ${result.daily_metrics_synced} Tage Gesundheitsdaten geladen.`,
      );
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Garmin trennen',
      'Verbindung loeschen und alle Garmin-Daten aus der lokalen DB entfernen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Trennen', style: 'destructive', onPress: disconnect },
      ],
    );
  };

  const performReset = async () => {
    try {
      await apiPost<{ status: string }>('/account/reset', {});
      await refresh();
      Alert.alert(
        'Zurueckgesetzt',
        'Athlete-Profil, Garmin-Daten und Verbindung wurden geloescht.',
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Reset fehlgeschlagen';
      Alert.alert('Reset fehlgeschlagen', message);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Alle Daten zuruecksetzen?',
      'Dies loescht dein Athlete-Profil, alle synchronisierten Garmin-Daten und die Garmin-Verbindung. Deine Anmeldung bleibt erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Zuruecksetzen', style: 'destructive', onPress: performReset },
      ],
    );
  };

  const garminConnected = status?.connected ?? false;
  const garminEmail = status?.display_name || status?.email || 'noch nicht verbunden';
  const garminCreatedAt = status?.connected_since;

  return (
    <View className="flex-1 bg-background">
      <GradientHeader title="Einstellungen" />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <ProfileHeader email={garminEmail} createdAt={garminCreatedAt ?? undefined} />

        {error && (
          <View className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-error-light">
            <Text className="text-error text-xs">{error}</Text>
          </View>
        )}

        <View className="mx-4 mt-2">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow
              icon={Sparkles}
              label="Wie Athletly dich sieht"
              onPress={() => router.push('/athlete-profile')}
              isLast
            />
          </Card>
        </View>

        <SectionTitle>Verbundene Dienste</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <ServiceStatus
              name="Garmin Connect"
              icon={Activity}
              isConnected={garminConnected}
              lastSync={status?.last_sync_at ?? undefined}
              onConnect={() => setModalVisible(true)}
              onDisconnect={handleDisconnect}
            />
            <ServiceStatus
              name="Apple Health"
              icon={Heart}
              isConnected={false}
              onConnect={() => Alert.alert('Apple Health', 'Noch nicht implementiert.')}
              isLast
            />
          </Card>

          {garminConnected && (
            <View className="mt-3 flex-row items-center justify-between bg-surface rounded-2xl px-4 py-3">
              <View className="flex-1 mr-3">
                <Text className="text-text-primary text-sm font-medium">
                  {status?.activity_count ?? 0} Aktivitaeten in der DB
                </Text>
                <Text className="text-text-muted text-xs mt-0.5">
                  {formatRelative(status?.last_sync_at ?? null) ?? 'Noch nie synchronisiert'}
                </Text>
              </View>
              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                label={isSyncing ? 'Synct...' : 'Sync'}
                onPress={handleSync}
                loading={isSyncing}
                disabled={isSyncing}
              />
            </View>
          )}
        </View>

        <SectionTitle>Einstellungen</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={Bell} label="Benachrichtigungen" value="An" onPress={() => {}} />
            <SettingsRow icon={Globe} label="Sprache" value="Deutsch" onPress={() => {}} />
            <SettingsRow icon={Moon} label="Erscheinungsbild" value="Hell" onPress={() => {}} isLast />
          </Card>
        </View>

        <SectionTitle>Account</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={Lock} label="Datenschutz" onPress={() => {}} />
            <SettingsRow icon={HelpCircle} label="Hilfe & Support" onPress={() => {}} />
            <SettingsRow
              icon={RotateCcw}
              label="Alle Daten zuruecksetzen"
              onPress={handleReset}
              isDestructive
            />
            <SettingsRow icon={LogOut} label="Abmelden" onPress={() => {}} isDestructive isLast />
          </Card>
        </View>
      </ScrollView>

      <GarminConnectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleConnectSuccess}
      />
    </View>
  );
}
