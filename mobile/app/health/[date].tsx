import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Colors } from '@athletly/shared';
import { fmtHealthDate, fmtSleepDuration, scoreColor } from '@/components/data/HealthDayCard';
import type { DailyMetric } from '@/lib/use-metrics';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Zurueck">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </Pressable>
  );
}

const SLEEP_PHASES: { key: keyof DailyMetric; label: string; color: string }[] = [
  { key: 'sleep_deep_minutes', label: 'Tief', color: '#1D4ED8' },
  { key: 'sleep_light_minutes', label: 'Leicht', color: '#60A5FA' },
  { key: 'sleep_rem_minutes', label: 'REM', color: '#A855F7' },
  { key: 'sleep_awake_minutes', label: 'Wach', color: '#F59E0B' },
];

function SleepBreakdown({ metric }: { metric: DailyMetric }) {
  const phases = SLEEP_PHASES.map((p) => ({
    ...p,
    minutes: (metric[p.key] as number | null) ?? 0,
  })).filter((p) => p.minutes > 0);
  const total = phases.reduce((sum, p) => sum + p.minutes, 0);
  if (total === 0) return null;

  return (
    <View className="mb-4">
      <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">
        Schlafphasen
      </Text>
      <View className="flex-row h-3 rounded-full overflow-hidden mb-2">
        {phases.map((p) => (
          <View key={p.label} style={{ flex: p.minutes, backgroundColor: p.color }} />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {phases.map((p) => {
          const h = Math.floor(p.minutes / 60);
          const m = Math.round(p.minutes % 60);
          return (
            <View key={p.label} className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <Text className="text-text-secondary text-xs">
                {p.label} {h > 0 ? `${h}h ` : ''}{m}min
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="rounded-xl px-4 py-3 mb-2"
      style={{ backgroundColor: Colors.surface, width: '48%' }}
    >
      <Text className="text-text-muted text-[11px] uppercase tracking-wide">{label}</Text>
      <Text className="text-text-primary text-lg font-bold mt-1">{value}</Text>
    </View>
  );
}

function allStats(m: DailyMetric): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (m.recovery_score !== null) out.push({ label: 'Recovery', value: `${m.recovery_score}` });
  if (m.hrv_avg !== null) out.push({ label: 'HRV', value: `${Math.round(m.hrv_avg)} ms` });
  if (m.resting_heart_rate !== null) out.push({ label: 'Ruhe-HF', value: `${m.resting_heart_rate} bpm` });
  if (m.body_battery_high !== null)
    out.push({
      label: 'Body Battery',
      value: `${m.body_battery_high}${m.body_battery_low !== null ? ` / ${m.body_battery_low}` : ''}`,
    });
  if (m.stress_avg !== null) out.push({ label: 'Stress', value: `${m.stress_avg}` });
  if (m.spo2_avg !== null) out.push({ label: 'SpO2', value: `${Math.round(m.spo2_avg)}%` });
  if (m.respiration_avg !== null) out.push({ label: 'Atmung', value: `${Math.round(m.respiration_avg)}/min` });
  if (m.vo2max !== null) out.push({ label: 'VO2max', value: `${Math.round(m.vo2max)}` });
  if (m.steps !== null) out.push({ label: 'Schritte', value: m.steps.toLocaleString('de-DE') });
  if (m.intensity_minutes !== null) out.push({ label: 'Intensitaet', value: `${m.intensity_minutes} min` });
  if (m.active_calories !== null) out.push({ label: 'Aktiv kcal', value: `${m.active_calories}` });
  if (m.total_calories !== null) out.push({ label: 'Gesamt kcal', value: `${m.total_calories}` });
  return out;
}

export default function HealthDayDetailScreen() {
  const params = useLocalSearchParams<{ date: string; data?: string }>();

  const metric = useMemo<DailyMetric | null>(() => {
    if (!params.data) return null;
    try {
      return JSON.parse(params.data) as DailyMetric;
    } catch {
      return null;
    }
  }, [params.data]);

  const sleepDuration = metric ? fmtSleepDuration(metric.sleep_duration_minutes) : null;

  return (
    <View className="flex-1 bg-background">
      <GradientHeader
        title="Tagesdetails"
        subtitle={metric ? fmtHealthDate(metric.date) : (params.date ?? '')}
        leftContent={<BackButton />}
      />

      {!metric ? (
        <View className="items-center px-8 py-12">
          <Text className="text-text-secondary text-sm text-center">
            Keine Daten fuer diesen Tag.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {metric.sleep_score !== null && (
            <View
              className="rounded-2xl p-4 mb-4"
              style={{ backgroundColor: Colors.surface }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-text-secondary text-sm">Schlaf-Score</Text>
                <Text
                  className="text-3xl font-bold"
                  style={{ color: scoreColor(metric.sleep_score) }}
                >
                  {metric.sleep_score}
                </Text>
              </View>
              {sleepDuration && (
                <Text className="text-text-muted text-xs">Gesamt {sleepDuration}</Text>
              )}
            </View>
          )}

          <SleepBreakdown metric={metric} />

          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">
            Tageswerte
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {allStats(metric).map((s) => (
              <StatBox key={s.label} label={s.label} value={s.value} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
