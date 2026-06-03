'use client';

// Web port of mobile/app/(tabs)/settings.tsx. Same sections (profile entry,
// connected services, settings, AI usage, GDPR, account). Alert.alert flows ->
// confirmAction/notify; router.push -> Next router. /account/reset, export,
// consent withdraw, delete, garmin sync/disconnect all hit the same endpoints.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ChevronRight,
  Crown,
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
  Zap,
} from 'lucide-react';
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
import { useUsage } from '@/lib/use-usage';
import { deleteAccount, exportAccountData } from '@/lib/use-account';
import { Colors } from '@athletly/shared';
import { confirmAction, notify } from '@/lib/dialog';

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-text-muted text-xs font-semibold uppercase tracking-wide px-4 mb-2 mt-4">
      {children}
    </p>
  );
}

function formatResetDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
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
  const { usage } = useUsage();
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConnectSuccess = async () => {
    setModalVisible(false);
    await refresh();
  };

  const handleSync = async () => {
    const result = await sync();
    if (result) {
      notify(
        `Sync abgeschlossen: ${result.activities_synced} Aktivitaeten und ${result.daily_metrics_synced} Tage Gesundheitsdaten geladen.`,
      );
    }
  };

  const handleDisconnect = () => {
    if (confirmAction('Verbindung loeschen und alle Garmin-Daten aus der lokalen DB entfernen?')) {
      disconnect();
    }
  };

  const performReset = async () => {
    try {
      await apiPost<{ status: string }>('/account/reset', {});
      await refresh();
      notify('Zurueckgesetzt: Athlete-Profil, Garmin-Daten und Verbindung wurden geloescht.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Reset fehlgeschlagen';
      notify(`Reset fehlgeschlagen: ${message}`);
    }
  };

  const handleReset = () => {
    if (
      confirmAction(
        'Dies loescht dein Athlete-Profil, alle synchronisierten Garmin-Daten und die Garmin-Verbindung. Deine Anmeldung bleibt erhalten. Fortfahren?',
      )
    ) {
      performReset();
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportAccountData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Export fehlgeschlagen';
      notify(`Export fehlgeschlagen: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawConsent = () => {
    if (
      confirmAction(
        'Ohne Einwilligung kann Athletly deine Gesundheitsdaten nicht mehr verarbeiten und dich nicht coachen. Du wirst zum Einwilligungsbildschirm geleitet. Widerrufen?',
      )
    ) {
      setConsent(false).catch(() => notify('Widerruf fehlgeschlagen. Bitte erneut versuchen.'));
    }
  };

  const performDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Loeschung fehlgeschlagen';
      notify(`Loeschung fehlgeschlagen: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    if (
      confirmAction(
        'Dies loescht deinen Account und ALLE Daten unwiderruflich: Profil, Trainings- und Gesundheitsdaten, Plaene und Garmin-Verbindung. Dies kann nicht rueckgaengig gemacht werden. Endgueltig loeschen?',
      )
    ) {
      performDelete();
    }
  };

  const handleSignOut = () => {
    if (confirmAction('Aktuelle Session beenden?')) signOut();
  };

  const garminConnected = status?.connected ?? false;
  const accountEmail = session?.user?.email ?? 'unbekannter Account';
  const accountCreatedAt = session?.user?.created_at;

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <GradientHeader title="Einstellungen" />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        <ProfileHeader email={accountEmail} createdAt={accountCreatedAt ?? undefined} />

        {error && (
          <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-error-light">
            <p className="text-error text-xs">{error}</p>
          </div>
        )}

        <div className="mx-4 mt-2">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow
              icon={Sparkles}
              label="Wie Athletly dich sieht"
              onPress={() => router.push('/athlete-profile')}
              isLast
            />
          </Card>
        </div>

        <SectionTitle>Verbundene Dienste</SectionTitle>
        <div className="mx-4">
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
              onConnect={() => notify('Apple Health: Noch nicht implementiert.')}
              isLast
            />
          </Card>

          {garminConnected && (
            <div className="mt-3 flex flex-row items-center justify-between bg-surface rounded-2xl px-2 py-1">
              <button
                type="button"
                onClick={() => router.push('/synced-data')}
                className="flex-1 flex flex-row items-center px-2 py-2 text-left"
                aria-label="Synced Data ansehen"
              >
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium">Synced Data</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {status?.activity_count ?? 0} Aktivitaeten ·{' '}
                    {formatRelative(status?.last_sync_at ?? null) ?? 'Noch nie synchronisiert'}
                  </p>
                </div>
                <ChevronRight size={18} color={Colors.textMuted} />
              </button>
              <div className="px-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  label={isSyncing ? 'Synct...' : 'Sync'}
                  onPress={handleSync}
                  loading={isSyncing}
                  disabled={isSyncing}
                />
              </div>
            </div>
          )}
        </div>

        <SectionTitle>Einstellungen</SectionTitle>
        <div className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={Bell} label="Benachrichtigungen" value="An" onPress={() => {}} />
            <SettingsRow icon={Globe} label="Sprache" value="Deutsch" onPress={() => {}} />
            <SettingsRow icon={Moon} label="Erscheinungsbild" value="Hell" onPress={() => {}} isLast />
          </Card>
        </div>

        <SectionTitle>KI-Nutzung</SectionTitle>
        <div className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow
              icon={Zap}
              label="KI-Credits"
              value={
                usage == null
                  ? '...'
                  : usage.limit == null
                    ? `${usage.used} genutzt`
                    : `${usage.used} / ${usage.limit}`
              }
            />
            <SettingsRow
              label="Reset"
              value={usage ? `am ${formatResetDate(usage.resetsAt)}` : '-'}
              isLast={usage?.tier === 'pro' || usage?.tier === 'grandfather'}
            />
            {usage && usage.tier !== 'pro' && usage.tier !== 'grandfather' && (
              <SettingsRow
                icon={Crown}
                label="Upgrade auf Pro"
                onPress={() => router.push('/paywall')}
                isLast
              />
            )}
          </Card>
          {usage?.tier === 'grandfather' && (
            <p className="text-text-muted text-xs px-4 mt-1.5">Unbegrenzter Zugang (Grandfather).</p>
          )}
        </div>

        <SectionTitle>Datenschutz & DSGVO</SectionTitle>
        <div className="mx-4">
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
            <SettingsRow icon={Lock} label="Datenschutzerklaerung" onPress={() => {}} isLast />
          </Card>
        </div>

        <SectionTitle>Account</SectionTitle>
        <div className="mx-4">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={HelpCircle} label="Hilfe & Support" onPress={() => {}} />
            <SettingsRow icon={RotateCcw} label="Alle Daten zuruecksetzen" onPress={handleReset} isDestructive />
            <SettingsRow icon={LogOut} label="Abmelden" onPress={handleSignOut} isDestructive />
            <SettingsRow
              icon={Trash2}
              label="Account loeschen"
              onPress={busy ? undefined : handleDeleteAccount}
              isDestructive
              isLast
            />
          </Card>
        </div>
      </div>

      <GarminConnectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleConnectSuccess}
      />
    </div>
  );
}
