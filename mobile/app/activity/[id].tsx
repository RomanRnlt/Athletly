import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Colors } from '@athletly/shared';
import { getSportColor } from '@/lib/sport-colors';
import { getSportIcon, getSportLabel } from '@/lib/sport-icons';
import {
  fmtActivityDate,
  fmtDuration,
  fmtPace,
} from '@/components/data/ActivityCard';
import { useActivityDetail } from '@/lib/use-activity-detail';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Zurueck">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </Pressable>
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

const EXTRA_LABELS: Record<string, { label: string; fmt: (v: number | string) => string }> = {
  training_effect_aerobic: { label: 'Aerober Effekt', fmt: (v) => `${v}` },
  training_effect_anaerobic: { label: 'Anaerober Effekt', fmt: (v) => `${v}` },
  training_effect_label: { label: 'Effekt', fmt: (v) => `${v}` },
  avg_cadence: { label: 'Trittfrequenz', fmt: (v) => `${Math.round(Number(v))}` },
  max_cadence: { label: 'Max Trittfreq.', fmt: (v) => `${Math.round(Number(v))}` },
  avg_power_w: { label: 'Power', fmt: (v) => `${Math.round(Number(v))} W` },
  max_power_w: { label: 'Max Power', fmt: (v) => `${Math.round(Number(v))} W` },
  normalized_power_w: { label: 'Norm. Power', fmt: (v) => `${Math.round(Number(v))} W` },
  avg_stride_length_m: { label: 'Schrittlaenge', fmt: (v) => `${Number(v).toFixed(2)} m` },
  avg_vertical_oscillation: { label: 'Vert. Osz.', fmt: (v) => `${Number(v).toFixed(1)} cm` },
  avg_ground_contact_ms: { label: 'Bodenkontakt', fmt: (v) => `${Math.round(Number(v))} ms` },
  elevation_loss_m: { label: 'Abstieg', fmt: (v) => `${Math.round(Number(v))} hm` },
  min_elevation_m: { label: 'Min Hoehe', fmt: (v) => `${Math.round(Number(v))} m` },
  max_elevation_m: { label: 'Max Hoehe', fmt: (v) => `${Math.round(Number(v))} m` },
  moving_duration_s: { label: 'Bewegungszeit', fmt: (v) => fmtDuration(Number(v)) ?? '-' },
  lap_count: { label: 'Runden', fmt: (v) => `${v}` },
  steps: { label: 'Schritte', fmt: (v) => Number(v).toLocaleString('de-DE') },
  min_temperature_c: { label: 'Min Temp', fmt: (v) => `${Math.round(Number(v))} C` },
  max_temperature_c: { label: 'Max Temp', fmt: (v) => `${Math.round(Number(v))} C` },
  device: { label: 'Geraet', fmt: (v) => `${v}` },
  location: { label: 'Ort', fmt: (v) => `${v}` },
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activity, extras, isLoading, error } = useActivityDetail(id ?? '');

  const sport = (activity?.sport || 'unknown').toLowerCase();
  const color = getSportColor(sport);
  const Icon = getSportIcon(sport);

  const primaryStats: { label: string; value: string }[] = [];
  if (activity) {
    const dur = fmtDuration(activity.duration_seconds);
    if (dur) primaryStats.push({ label: 'Dauer', value: dur });
    if (activity.distance_meters)
      primaryStats.push({
        label: 'Distanz',
        value: `${(activity.distance_meters / 1000).toFixed(2)} km`,
      });
    const pace = fmtPace(activity.avg_pace_min_km);
    if (pace) primaryStats.push({ label: 'Pace', value: pace });
    if (activity.avg_hr) primaryStats.push({ label: 'HF', value: `${activity.avg_hr} bpm` });
    if (activity.max_hr) primaryStats.push({ label: 'Max HF', value: `${activity.max_hr} bpm` });
    if (activity.calories) primaryStats.push({ label: 'Kalorien', value: `${activity.calories}` });
    if (activity.elevation_gain_m)
      primaryStats.push({ label: 'Aufstieg', value: `${Math.round(activity.elevation_gain_m)} hm` });
    if (activity.training_effect)
      primaryStats.push({ label: 'Training Effect', value: `${activity.training_effect}` });
  }

  const extraEntries = Object.entries(extras)
    .filter(([k]) => k in EXTRA_LABELS && k !== 'activity_name')
    .map(([k, v]) => ({ label: EXTRA_LABELS[k].label, value: EXTRA_LABELS[k].fmt(v) }));

  const title = (extras.activity_name as string) || getSportLabel(sport);

  return (
    <View className="flex-1 bg-background">
      <GradientHeader
        title={getSportLabel(sport)}
        subtitle={activity ? fmtActivityDate(activity.start_time) : ''}
        leftContent={<BackButton />}
      />

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : error ? (
        <View className="mx-4 mt-4 px-4 py-2.5 rounded-xl bg-error-light">
          <Text className="text-error text-xs">{error}</Text>
        </View>
      ) : activity ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center mb-4">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon size={24} color={color} strokeWidth={2} />
            </View>
            <Text className="text-text-primary text-lg font-bold flex-1">{title}</Text>
          </View>

          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2">
            Kennzahlen
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {primaryStats.map((s) => (
              <StatBox key={s.label} label={s.label} value={s.value} />
            ))}
          </View>

          {extraEntries.length > 0 && (
            <>
              <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2 mt-4">
                Details
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {extraEntries.map((e) => (
                  <StatBox key={e.label} label={e.label} value={e.value} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
