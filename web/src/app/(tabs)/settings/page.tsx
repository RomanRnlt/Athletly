'use client';
// SPDX-License-Identifier: MIT

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
import { DEMO_MODE } from '@/lib/demo';

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-text-muted text-xs font-semibold uppercase tracking-wide px-4 md:px-0 mb-2 mt-4">
      {children}
    </p>
  );
}

// Groups a section title with its card(s) so the desktop two-column grid keeps
// each title attached to its content as a single grid item.
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="md:break-inside-avoid mb-1 md:mb-5">
      {title && <SectionTitle>{title}</SectionTitle>}
      <div className="mx-4 md:mx-0">{children}</div>
    </section>
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
    if (DEMO_MODE) {
      notify('Demo-Modus: Das Zuruecksetzen der Daten ist in dieser Demo deaktiviert.');
      return;
    }
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
      <GradientHeader title="Einstellungen" contentMaxWidthClass="md:max-w-4xl" />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8 md:pb-12">
       <div className="mx-auto w-full md:max-w-4xl md:px-10 md:pt-6">
        <ProfileHeader email={accountEmail} createdAt={accountCreatedAt ?? undefined} />

        {error && (
          <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-error-light">
            <p className="text-error text-xs">{error}</p>
          </div>
        )}

        <Section>
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow
              icon={Sparkles}
              label="Wie Athletly dich sieht"
              onPress={() => router.push('/athlete-profile')}
              isLast
            />
          </Card>
        </Section>

        {/* Two balanced columns on desktop; single stack on mobile. */}
        <div className="md:columns-2 md:gap-8">
        <Section title="Verbundene Dienste">
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
        </Section>

        <Section title="Einstellungen">
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={Bell} label="Benachrichtigungen" value="An" onPress={() => {}} />
            <SettingsRow icon={Globe} label="Sprache" value="Deutsch" onPress={() => {}} />
            <SettingsRow icon={Moon} label="Erscheinungsbild" value="Hell" onPress={() => {}} isLast />
          </Card>
        </Section>

        <Section title="KI-Nutzung">
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
            <p className="text-text-muted text-xs px-4 md:px-0 mt-1.5">Unbegrenzter Zugang (Grandfather).</p>
          )}
        </Section>

        <Section title="Datenschutz & DSGVO">
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
        </Section>

        <Section title="Account">
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
        </Section>
        </div>
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
