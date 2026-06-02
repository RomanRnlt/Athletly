import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  Bell,
  ChevronRight,
  Download,
  Globe,
  HelpCircle,
  Heart,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import { signOut, useAuth } from '@/lib/use-auth';
import { useConsent } from '@/lib/consent-context';
import { deleteAccount, exportAccountData } from '@/lib/use-account';
import { Colors } from '@/lib/colors';

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
  const { session } = useAuth();
  const { status, isSyncing, error, refresh, sync, disconnect } = useGarmin();
  const { status: consent, setConsent } = useConsent();
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportAccountData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Export fehlgeschlagen';
      Alert.alert('Export fehlgeschlagen', message);
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawConsent = () => {
    Alert.alert(
      'Einwilligung widerrufen?',
      'Ohne Einwilligung kann Athletly deine Gesundheitsdaten nicht mehr verarbeiten und dich nicht coachen. Du wirst zum Einwilligungsbildschirm geleitet.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Widerrufen',
          style: 'destructive',
          onPress: async () => {
            try {
              await setConsent(false);
            } catch {
              Alert.alert('Fehler', 'Widerruf fehlgeschlagen. Bitte erneut versuchen.');
            }
          },
        },
      ],
    );
  };

  const performDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      // signOut inside deleteAccount triggers the auth listener -> /login.
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Loeschung fehlgeschlagen';
      Alert.alert('Loeschung fehlgeschlagen', message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Account endgueltig loeschen?',
      'Dies loescht deinen Account und ALLE Daten unwiderruflich: Profil, Trainings- und Gesundheitsdaten, Plaene und Garmin-Verbindung. Dies kann nicht rueckgaengig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Endgueltig loeschen', style: 'destructive', onPress: performDelete },
      ],
    );
  };

  const garminConnected = status?.connected ?? false;
  const accountEmail = session?.user?.email ?? 'unbekannter Account';
  const accountCreatedAt = session?.user?.created_at;

  return (
    <View className="flex-1 bg-background">
      <GradientHeader title="Einstellungen" />

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <ProfileHeader email={accountEmail} createdAt={accountCreatedAt ?? undefined} />

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
            <View className="mt-3 flex-row items-center justify-between bg-surface rounded-2xl px-2 py-1">
              <Pressable
                onPress={() => router.push('/synced-data')}
                className="flex-1 flex-row items-center px-2 py-2"
                accessibilityRole="button"
                accessibilityLabel="Synced Data ansehen"
              >
                <View className="flex-1">
                  <Text className="text-text-primary text-sm font-medium">Synced Data</Text>
                  <Text className="text-text-muted text-xs mt-0.5">
                    {status?.activity_count ?? 0} Aktivitaeten ·{' '}
                    {formatRelative(status?.last_sync_at ?? null) ?? 'Noch nie synchronisiert'}
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </Pressable>
              <View className="px-2">
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

        <SectionTitle>Datenschutz & DSGVO</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow
              icon={ShieldCheck}
              label="Einwilligung Gesundheitsdaten"
              value={consent?.granted ? 'Erteilt' : 'Offen'}
              onPress={consent?.granted ? handleWithdrawConsent : undefined}
            />
            <SettingsRow
              icon={Download}
              label="Meine Daten exportieren"
              onPress={busy ? undefined : handleExport}
            />
            <SettingsRow
              icon={Lock}
              label="Datenschutzerklaerung"
              onPress={() => {}}
              isLast
            />
          </Card>
        </View>

        <SectionTitle>Account</SectionTitle>
        <View className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={HelpCircle} label="Hilfe & Support" onPress={() => {}} />
            <SettingsRow
              icon={RotateCcw}
              label="Alle Daten zuruecksetzen"
              onPress={handleReset}
              isDestructive
            />
            <SettingsRow
              icon={LogOut}
              label="Abmelden"
              onPress={() =>
                Alert.alert('Abmelden', 'Aktuelle Session beenden?', [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Abmelden', style: 'destructive', onPress: () => signOut() },
                ])
              }
              isDestructive
            />
            <SettingsRow
              icon={Trash2}
              label="Account loeschen"
              onPress={busy ? undefined : handleDeleteAccount}
              isDestructive
              isLast
            />
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
