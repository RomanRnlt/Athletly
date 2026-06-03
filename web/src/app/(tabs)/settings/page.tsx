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
import { useI18n, useT, type TranslateFn } from '@/i18n';
import type { Locale } from '@/i18n';

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

// Compact DE/EN segmented toggle shown in the settings "Language" row. Setting
// the locale persists it and updates <html lang> via the i18n provider.
function LanguageToggle({
  locale,
  onChange,
  t,
}: {
  locale: Locale;
  onChange: (next: Locale) => void;
  t: TranslateFn;
}) {
  const options: { value: Locale; label: string }[] = [
    { value: 'de', label: 'DE' },
    { value: 'en', label: 'EN' },
  ];
  return (
    <div
      className="flex flex-row rounded-lg p-0.5"
      style={{ backgroundColor: Colors.surfaceNested }}
      role="group"
      aria-label={t('settings.language')}
    >
      {options.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="px-3 py-1 rounded-md text-xs font-semibold transition-colors"
            style={{
              backgroundColor: active ? Colors.surface : 'transparent',
              color: active ? Colors.primary : Colors.textSecondary,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function formatResetDate(intlLocale: string, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(intlLocale, { day: 'numeric', month: 'long' });
}

function formatRelative(t: TranslateFn, iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const min = Math.floor(ms / 60_000);
  if (min < 1) return t('time.justNow');
  if (min < 60) return t('time.minutesAgo', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('time.hoursAgo', { n: h });
  const d = Math.floor(h / 24);
  return d > 1 ? t('time.daysAgoMany', { n: d }) : t('time.daysAgoOne', { n: d });
}

export default function SettingsScreen() {
  const t = useT();
  const { locale, setLocale, intlLocale } = useI18n();
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
        t('settings.syncDone', {
          activities: result.activities_synced,
          days: result.daily_metrics_synced,
        }),
      );
    }
  };

  const handleDisconnect = () => {
    if (confirmAction(t('settings.disconnectConfirm'))) {
      disconnect();
    }
  };

  const performReset = async () => {
    if (DEMO_MODE) {
      notify(t('demo.resetDisabled'));
      return;
    }
    try {
      await apiPost<{ status: string }>('/account/reset', {});
      await refresh();
      notify(t('settings.resetDone'));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('settings.resetFailed');
      notify(t('settings.resetFailedWith', { message }));
    }
  };

  const handleReset = () => {
    if (confirmAction(t('settings.resetConfirm'))) {
      performReset();
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportAccountData(t('demo.exportDisabled'));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('settings.exportFailed');
      notify(t('settings.exportFailedWith', { message }));
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawConsent = () => {
    if (confirmAction(t('settings.withdrawConsentConfirm'))) {
      setConsent(false).catch(() => notify(t('settings.withdrawFailed')));
    }
  };

  const performDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount(t('demo.deleteDisabled'));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('settings.deleteFailed');
      notify(t('settings.deleteFailedWith', { message }));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirmAction(t('settings.deleteConfirm'))) {
      performDelete();
    }
  };

  const handleSignOut = () => {
    if (confirmAction(t('settings.signOutConfirm'))) signOut();
  };

  const garminConnected = status?.connected ?? false;
  const accountEmail = session?.user?.email ?? t('settings.unknownAccount');
  const accountCreatedAt = session?.user?.created_at;

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <GradientHeader title={t('settings.title')} contentMaxWidthClass="md:max-w-4xl" />

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
              label={t('settings.howAthletlySeesYou')}
              onPress={() => router.push('/athlete-profile')}
              isLast
            />
          </Card>
        </Section>

        {/* Two balanced columns on desktop; single stack on mobile. */}
        <div className="md:columns-2 md:gap-8">
        <Section title={t('settings.sectionServices')}>
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
              name={t('settings.appleHealth')}
              icon={Heart}
              isConnected={false}
              onConnect={() => notify(t('settings.appleHealthNotImplemented'))}
              isLast
            />
          </Card>

          {garminConnected && (
            <div className="mt-3 flex flex-row items-center justify-between bg-surface rounded-2xl px-2 py-1">
              <button
                type="button"
                onClick={() => router.push('/synced-data')}
                className="flex-1 flex flex-row items-center px-2 py-2 text-left"
                aria-label={t('settings.syncedDataAria')}
              >
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium">{t('settings.syncedData')}</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {t('settings.syncedSummary', {
                      count: status?.activity_count ?? 0,
                      sync:
                        formatRelative(t, status?.last_sync_at ?? null) ??
                        t('settings.neverSynced'),
                    })}
                  </p>
                </div>
                <ChevronRight size={18} color={Colors.textMuted} />
              </button>
              <div className="px-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  label={isSyncing ? t('settings.syncing') : t('settings.sync')}
                  onPress={handleSync}
                  loading={isSyncing}
                  disabled={isSyncing}
                />
              </div>
            </div>
          )}
        </Section>

        <Section title={t('settings.sectionSettings')}>
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={Bell} label={t('settings.notifications')} value={t('common.on')} onPress={() => {}} />
            <SettingsRow
              icon={Globe}
              label={t('settings.language')}
              rightElement={<LanguageToggle locale={locale} onChange={setLocale} t={t} />}
            />
            <SettingsRow icon={Moon} label={t('settings.appearance')} value={t('settings.appearanceLight')} onPress={() => {}} isLast />
          </Card>
        </Section>

        <Section title={t('settings.sectionAiUsage')}>
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow
              icon={Zap}
              label={t('settings.aiCredits')}
              value={
                usage == null
                  ? '...'
                  : usage.limit == null
                    ? t('settings.creditsUsed', { used: usage.used })
                    : t('settings.creditsUsedOfLimit', { used: usage.used, limit: usage.limit })
              }
            />
            <SettingsRow
              label={t('settings.reset')}
              value={usage ? t('settings.resetOn', { date: formatResetDate(intlLocale, usage.resetsAt) }) : '-'}
              isLast={usage?.tier === 'pro' || usage?.tier === 'grandfather'}
            />
            {usage && usage.tier !== 'pro' && usage.tier !== 'grandfather' && (
              <SettingsRow
                icon={Crown}
                label={t('settings.upgradeToPro')}
                onPress={() => router.push('/paywall')}
                isLast
              />
            )}
          </Card>
          {usage?.tier === 'grandfather' && (
            <p className="text-text-muted text-xs px-4 md:px-0 mt-1.5">{t('settings.grandfatherNote')}</p>
          )}
        </Section>

        <Section title={t('settings.sectionPrivacy')}>
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow
              icon={ShieldCheck}
              label={t('settings.consentHealthData')}
              value={consent?.granted ? t('settings.consentGranted') : t('settings.consentOpen')}
              onPress={consent?.granted ? handleWithdrawConsent : undefined}
            />
            <SettingsRow
              icon={Download}
              label={t('settings.exportMyData')}
              onPress={busy ? undefined : handleExport}
            />
            <SettingsRow icon={Lock} label={t('settings.privacyPolicy')} onPress={() => {}} isLast />
          </Card>
        </Section>

        <Section title={t('settings.sectionAccount')}>
          <Card variant="standard" className="p-0 overflow-hidden">
            <SettingsRow icon={HelpCircle} label={t('settings.helpSupport')} onPress={() => {}} />
            <SettingsRow icon={RotateCcw} label={t('settings.resetAllData')} onPress={handleReset} isDestructive />
            <SettingsRow icon={LogOut} label={t('settings.signOut')} onPress={handleSignOut} isDestructive />
            <SettingsRow
              icon={Trash2}
              label={t('settings.deleteAccount')}
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
