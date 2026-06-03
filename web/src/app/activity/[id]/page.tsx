'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/activity/[id].tsx.
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Colors } from '@athletly/shared';
import { getSportColor } from '@/lib/sport-colors';
import { getSportIcon, getSportLabel } from '@/lib/sport-icons';
import { fmtActivityDate, fmtDuration, fmtPace } from '@/components/data/ActivityCard';
import { useActivityDetail } from '@/lib/use-activity-detail';
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

type ExtraFmt = (v: number | string, intlLocale: string) => string;
const EXTRA_LABELS: Record<string, { labelKey: MessageKey; fmt: ExtraFmt }> = {
  training_effect_aerobic: { labelKey: 'activity.extra.training_effect_aerobic', fmt: (v) => `${v}` },
  training_effect_anaerobic: { labelKey: 'activity.extra.training_effect_anaerobic', fmt: (v) => `${v}` },
  training_effect_label: { labelKey: 'activity.extra.training_effect_label', fmt: (v) => `${v}` },
  avg_cadence: { labelKey: 'activity.extra.avg_cadence', fmt: (v) => `${Math.round(Number(v))}` },
  max_cadence: { labelKey: 'activity.extra.max_cadence', fmt: (v) => `${Math.round(Number(v))}` },
  avg_power_w: { labelKey: 'activity.extra.avg_power_w', fmt: (v) => `${Math.round(Number(v))} W` },
  max_power_w: { labelKey: 'activity.extra.max_power_w', fmt: (v) => `${Math.round(Number(v))} W` },
  normalized_power_w: { labelKey: 'activity.extra.normalized_power_w', fmt: (v) => `${Math.round(Number(v))} W` },
  avg_stride_length_m: { labelKey: 'activity.extra.avg_stride_length_m', fmt: (v) => `${Number(v).toFixed(2)} m` },
  avg_vertical_oscillation: { labelKey: 'activity.extra.avg_vertical_oscillation', fmt: (v) => `${Number(v).toFixed(1)} cm` },
  avg_ground_contact_ms: { labelKey: 'activity.extra.avg_ground_contact_ms', fmt: (v) => `${Math.round(Number(v))} ms` },
  elevation_loss_m: { labelKey: 'activity.extra.elevation_loss_m', fmt: (v) => `${Math.round(Number(v))} hm` },
  min_elevation_m: { labelKey: 'activity.extra.min_elevation_m', fmt: (v) => `${Math.round(Number(v))} m` },
  max_elevation_m: { labelKey: 'activity.extra.max_elevation_m', fmt: (v) => `${Math.round(Number(v))} m` },
  moving_duration_s: { labelKey: 'activity.extra.moving_duration_s', fmt: (v) => fmtDuration(Number(v)) ?? '-' },
  lap_count: { labelKey: 'activity.extra.lap_count', fmt: (v) => `${v}` },
  steps: { labelKey: 'activity.extra.steps', fmt: (v, intlLocale) => formatNumber(intlLocale, Number(v)) },
  min_temperature_c: { labelKey: 'activity.extra.min_temperature_c', fmt: (v) => `${Math.round(Number(v))} C` },
  max_temperature_c: { labelKey: 'activity.extra.max_temperature_c', fmt: (v) => `${Math.round(Number(v))} C` },
  device: { labelKey: 'activity.extra.device', fmt: (v) => `${v}` },
  location: { labelKey: 'activity.extra.location', fmt: (v) => `${v}` },
};

export default function ActivityDetailScreen() {
  const t = useT();
  const { intlLocale } = useI18n();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { activity, extras, isLoading, error } = useActivityDetail(id);

  const sport = (activity?.sport || 'unknown').toLowerCase();
  const color = getSportColor(sport);
  const Icon = getSportIcon(sport);

  const primaryStats: { label: string; value: string }[] = [];
  if (activity) {
    const dur = fmtDuration(activity.duration_seconds);
    if (dur) primaryStats.push({ label: t('activity.duration'), value: dur });
    if (activity.distance_meters)
      primaryStats.push({ label: t('activity.distance'), value: `${(activity.distance_meters / 1000).toFixed(2)} km` });
    const pace = fmtPace(activity.avg_pace_min_km);
    if (pace) primaryStats.push({ label: t('activity.pace'), value: pace });
    if (activity.avg_hr) primaryStats.push({ label: t('activity.hr'), value: `${activity.avg_hr} bpm` });
    if (activity.max_hr) primaryStats.push({ label: t('activity.maxHr'), value: `${activity.max_hr} bpm` });
    if (activity.calories) primaryStats.push({ label: t('activity.calories'), value: `${activity.calories}` });
    if (activity.elevation_gain_m)
      primaryStats.push({ label: t('activity.elevationGain'), value: `${Math.round(activity.elevation_gain_m)} hm` });
    if (activity.training_effect)
      primaryStats.push({ label: t('activity.trainingEffect'), value: `${activity.training_effect}` });
  }

  const extraEntries = Object.entries(extras)
    .filter(([k]) => k in EXTRA_LABELS && k !== 'activity_name')
    .map(([k, v]) => ({ label: t(EXTRA_LABELS[k].labelKey), value: EXTRA_LABELS[k].fmt(v, intlLocale) }));

  const title = (extras.activity_name as string) || getSportLabel(t, sport);

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-background">
      <GradientHeader
        title={getSportLabel(t, sport)}
        subtitle={activity ? fmtActivityDate(intlLocale, activity.start_time) : ''}
        leftContent={<BackButton />}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <span
            className="inline-block h-6 w-6 rounded-full border-4 border-transparent animate-spin"
            style={{ borderTopColor: Colors.primary, borderRightColor: Colors.primary }}
          />
        </div>
      ) : error ? (
        <div className="mx-4 mt-4 px-4 py-2.5 rounded-xl bg-error-light">
          <p className="text-error text-xs">{error}</p>
        </div>
      ) : activity ? (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:px-10 md:py-8">
         <div className="mx-auto w-full md:max-w-4xl">
          <div className="flex flex-row items-center mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mr-3 shrink-0"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon size={24} color={color} strokeWidth={2} />
            </div>
            <p className="text-text-primary text-lg md:text-2xl font-bold flex-1">{title}</p>
          </div>

          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">{t('activity.keyMetrics')}</p>
          <div className="flex flex-row flex-wrap justify-between md:grid md:grid-cols-3 xl:grid-cols-4 md:gap-3">
            {primaryStats.map((s) => (
              <StatBox key={s.label} label={s.label} value={s.value} />
            ))}
          </div>

          {extraEntries.length > 0 && (
            <>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2 mt-6">{t('activity.details')}</p>
              <div className="flex flex-row flex-wrap justify-between md:grid md:grid-cols-3 xl:grid-cols-4 md:gap-3">
                {extraEntries.map((e) => (
                  <StatBox key={e.label} label={e.label} value={e.value} />
                ))}
              </div>
            </>
          )}
         </div>
        </div>
      ) : null}
    </div>
  );
}
