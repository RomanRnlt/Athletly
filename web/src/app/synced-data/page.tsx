'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/synced-data.tsx. Segmented control (Aktivitaeten /
// Gesundheit) + filter chips, lists ActivityCard / HealthDayCard. The health
// metric is stashed in sessionStorage before navigating to the detail page
// (the mobile app passes it as a route param).
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ActivityCard } from '@/components/data/ActivityCard';
import { HealthDayCard } from '@/components/data/HealthDayCard';
import { Colors } from '@athletly/shared';
import { getSportLabel } from '@/lib/sport-icons';
import { useActivities } from '@/lib/use-activities';
import { useMetrics, type DailyMetric } from '@/lib/use-metrics';

type Mode = 'activities' | 'health';

const HEALTH_CATEGORIES: { key: string; label: string; has: (m: DailyMetric) => boolean }[] = [
  { key: 'sleep', label: 'Schlaf', has: (m) => m.sleep_score !== null },
  { key: 'recovery', label: 'Recovery', has: (m) => m.recovery_score !== null },
  { key: 'hrv', label: 'HRV', has: (m) => m.hrv_avg !== null },
  { key: 'rhr', label: 'Ruhe-HF', has: (m) => m.resting_heart_rate !== null },
  { key: 'body_battery', label: 'Body Battery', has: (m) => m.body_battery_high !== null },
  { key: 'stress', label: 'Stress', has: (m) => m.stress_avg !== null },
  { key: 'spo2', label: 'SpO2', has: (m) => m.spo2_avg !== null },
  { key: 'steps', label: 'Schritte', has: (m) => m.steps !== null },
];

function BackButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} aria-label="Zurueck" className="flex items-center">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </button>
  );
}

function Segmented({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex flex-row mx-4 mt-3 p-1 rounded-xl" style={{ backgroundColor: Colors.surfaceNested }}>
      {(['activities', 'health'] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <button
            type="button"
            key={m}
            onClick={() => onChange(m)}
            className="flex-1 py-2 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: active ? Colors.surface : 'transparent' }}
          >
            <span className="text-sm font-semibold" style={{ color: active ? Colors.primary : Colors.textSecondary }}>
              {m === 'activities' ? 'Aktivitaeten' : 'Gesundheit'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex items-center justify-center mr-2 shrink-0"
      style={{
        height: 38,
        paddingLeft: 16,
        paddingRight: 16,
        borderRadius: 19,
        backgroundColor: selected ? Colors.primary : Colors.surface,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: selected ? Colors.primary : Colors.divider,
      }}
    >
      <span
        className="whitespace-nowrap"
        style={{ fontSize: 14, lineHeight: '18px', fontWeight: 500, color: selected ? '#FFFFFF' : Colors.textSecondary }}
      >
        {label}
      </span>
    </button>
  );
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 62 }}>
      <div className="overflow-x-auto no-scrollbar flex flex-row items-center" style={{ height: 62, paddingLeft: 16, paddingRight: 16 }}>
        {children}
      </div>
    </div>
  );
}

export default function SyncedDataScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('activities');
  const [healthFilter, setHealthFilter] = useState<string | null>(null);

  const activities = useActivities();
  const metrics = useMetrics(60);

  const availableHealthCategories = useMemo(
    () => HEALTH_CATEGORIES.filter((cat) => metrics.metrics.some((m) => cat.has(m))),
    [metrics.metrics],
  );

  const filteredMetrics = useMemo(() => {
    if (!healthFilter) return metrics.metrics;
    const cat = HEALTH_CATEGORIES.find((c) => c.key === healthFilter);
    if (!cat) return metrics.metrics;
    return metrics.metrics.filter((m) => cat.has(m));
  }, [metrics.metrics, healthFilter]);

  const isLoading = mode === 'activities' ? activities.isLoading : metrics.isLoading;
  const error = mode === 'activities' ? activities.error : metrics.error;
  const count = mode === 'activities' ? activities.activities.length : filteredMetrics.length;

  const openHealthDay = (m: DailyMetric) => {
    try {
      sessionStorage.setItem(`health:${m.date}`, JSON.stringify(m));
    } catch {
      // ignore storage failures; the detail page falls back to a message.
    }
    router.push(`/health/${encodeURIComponent(m.date)}`);
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-background">
      <GradientHeader
        title="Synced Data"
        subtitle={`${count} ${mode === 'activities' ? 'Aktivitaeten' : 'Tage'}`}
        leftContent={<BackButton />}
      />

      <div className="md:max-w-5xl md:mx-auto md:w-full md:px-6">
      <Segmented mode={mode} onChange={setMode} />

      {mode === 'activities' ? (
        <FilterRow>
          <Chip label="Alle" selected={activities.sportFilter === null} onPress={() => activities.setSportFilter(null)} />
          {activities.sports.map((s) => (
            <Chip
              key={s}
              label={getSportLabel(s)}
              selected={activities.sportFilter === s}
              onPress={() => activities.setSportFilter(s)}
            />
          ))}
        </FilterRow>
      ) : (
        <FilterRow>
          <Chip label="Alle" selected={healthFilter === null} onPress={() => setHealthFilter(null)} />
          {availableHealthCategories.map((cat) => (
            <Chip
              key={cat.key}
              label={cat.label}
              selected={healthFilter === cat.key}
              onPress={() => setHealthFilter(cat.key)}
            />
          ))}
        </FilterRow>
      )}
      </div>

      {error && (
        <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-error-light">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 md:pb-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span
              className="inline-block h-6 w-6 rounded-full border-4 border-transparent animate-spin"
              style={{ borderTopColor: Colors.primary, borderRightColor: Colors.primary }}
            />
          </div>
        ) : count === 0 ? (
          <div className="flex items-center justify-center px-8 py-12">
            <p className="text-text-secondary text-sm text-center">
              Keine Daten. Verbinde Garmin und starte einen Sync in den Einstellungen.
            </p>
          </div>
        ) : (
          <div className="md:max-w-5xl md:mx-auto md:w-full md:px-2 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-x-4">
            {mode === 'activities'
              ? activities.activities.map((item) => (
                  <ActivityCard
                    key={item.garmin_activity_id}
                    activity={item}
                    onPress={() => router.push(`/activity/${encodeURIComponent(item.garmin_activity_id)}`)}
                  />
                ))
              : filteredMetrics.map((item) => (
                  <HealthDayCard key={item.date} metric={item} onPress={() => openHealthDay(item)} />
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
