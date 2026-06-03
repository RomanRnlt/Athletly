'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/health/[date].tsx. The metric is read from
// sessionStorage (stashed by synced-data before navigation), mirroring the
// mobile route param `data`.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Colors } from '@athletly/shared';
import { fmtHealthDate, fmtSleepDuration, scoreColor } from '@/components/data/HealthDayCard';
import type { DailyMetric } from '@/lib/use-metrics';
import { useI18n, useT, type MessageKey, type TranslateFn } from '@/i18n';
import { formatNumber } from '@/lib/datetime';

function BackButton() {
  const router = useRouter();
  const t = useT();
  return (
    <button type="button" onClick={() => router.back()} aria-label={t('common.back')} className="flex items-center">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </button>
  );
}

const SLEEP_PHASES: { key: keyof DailyMetric; labelKey: MessageKey; color: string }[] = [
  { key: 'sleep_deep_minutes', labelKey: 'health.phaseDeep', color: '#1D4ED8' },
  { key: 'sleep_light_minutes', labelKey: 'health.phaseLight', color: '#60A5FA' },
  { key: 'sleep_rem_minutes', labelKey: 'health.phaseRem', color: '#A855F7' },
  { key: 'sleep_awake_minutes', labelKey: 'health.phaseAwake', color: '#F59E0B' },
];

function SleepBreakdown({ metric }: { metric: DailyMetric }) {
  const t = useT();
  const phases = SLEEP_PHASES.map((p) => ({
    ...p,
    minutes: (metric[p.key] as number | null) ?? 0,
  })).filter((p) => p.minutes > 0);
  const total = phases.reduce((sum, p) => sum + p.minutes, 0);
  if (total === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">{t('health.sleepPhases')}</p>
      <div className="flex flex-row h-3 rounded-full overflow-hidden mb-2">
        {phases.map((p) => (
          <div key={p.labelKey} style={{ flex: p.minutes, backgroundColor: p.color }} />
        ))}
      </div>
      <div className="flex flex-row flex-wrap gap-x-4 gap-y-1">
        {phases.map((p) => {
          const h = Math.floor(p.minutes / 60);
          const m = Math.round(p.minutes % 60);
          return (
            <div key={p.labelKey} className="flex flex-row items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-text-secondary text-xs">
                {t(p.labelKey)} {h > 0 ? `${h}h ` : ''}
                {m}min
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 mb-2 w-[48%] md:w-auto"
      style={{ backgroundColor: Colors.surface }}
    >
      <p className="text-text-muted text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-text-primary text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function allStats(t: TranslateFn, intlLocale: string, m: DailyMetric): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (m.recovery_score !== null) out.push({ label: t('health.recovery'), value: `${m.recovery_score}` });
  if (m.hrv_avg !== null) out.push({ label: t('health.hrv'), value: `${Math.round(m.hrv_avg)} ms` });
  if (m.resting_heart_rate !== null) out.push({ label: t('health.rhr'), value: `${m.resting_heart_rate} bpm` });
  if (m.body_battery_high !== null)
    out.push({
      label: t('health.bodyBattery'),
      value: `${m.body_battery_high}${m.body_battery_low !== null ? ` / ${m.body_battery_low}` : ''}`,
    });
  if (m.stress_avg !== null) out.push({ label: t('health.stress'), value: `${m.stress_avg}` });
  if (m.spo2_avg !== null) out.push({ label: t('health.spo2'), value: `${Math.round(m.spo2_avg)}%` });
  if (m.respiration_avg !== null) out.push({ label: t('health.respiration'), value: `${Math.round(m.respiration_avg)}/min` });
  if (m.vo2max !== null) out.push({ label: t('health.vo2max'), value: `${Math.round(m.vo2max)}` });
  if (m.steps !== null) out.push({ label: t('health.steps'), value: formatNumber(intlLocale, m.steps) });
  if (m.intensity_minutes !== null) out.push({ label: t('health.intensity'), value: `${m.intensity_minutes} min` });
  if (m.active_calories !== null) out.push({ label: t('health.activeKcal'), value: `${m.active_calories}` });
  if (m.total_calories !== null) out.push({ label: t('health.totalKcal'), value: `${m.total_calories}` });
  return out;
}

export default function HealthDayDetailScreen() {
  const t = useT();
  const { intlLocale } = useI18n();
  const params = useParams<{ date: string }>();
  const date = typeof params.date === 'string' ? decodeURIComponent(params.date) : '';
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRaw(sessionStorage.getItem(`health:${date}`));
    } catch {
      setRaw(null);
    }
  }, [date]);

  const metric = useMemo<DailyMetric | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DailyMetric;
    } catch {
      return null;
    }
  }, [raw]);

  const sleepDuration = metric ? fmtSleepDuration(metric.sleep_duration_minutes) : null;

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-background">
      <GradientHeader
        title={t('health.dayTitle')}
        subtitle={metric ? fmtHealthDate(intlLocale, metric.date) : date}
        leftContent={<BackButton />}
      />

      {!metric ? (
        <div className="flex items-center justify-center px-8 py-12">
          <p className="text-text-secondary text-sm text-center">{t('health.noDataDay')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:px-10 md:py-8">
         <div className="mx-auto w-full md:max-w-4xl">
          {metric.sleep_score !== null && (
            <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: Colors.surface }}>
              <div className="flex flex-row items-center justify-between mb-1">
                <span className="text-text-secondary text-sm">{t('health.sleepScore')}</span>
                <span className="text-3xl font-bold" style={{ color: scoreColor(metric.sleep_score) }}>
                  {metric.sleep_score}
                </span>
              </div>
              {sleepDuration && <p className="text-text-muted text-xs">{t('health.totalSleep', { duration: sleepDuration })}</p>}
            </div>
          )}

          <SleepBreakdown metric={metric} />

          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">{t('health.dailyValues')}</p>
          <div className="flex flex-row flex-wrap justify-between md:grid md:grid-cols-3 xl:grid-cols-4 md:gap-3">
            {allStats(t, intlLocale, metric).map((s) => (
              <StatBox key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
         </div>
        </div>
      )}
    </div>
  );
}
