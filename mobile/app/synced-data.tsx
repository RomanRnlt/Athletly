import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ActivityCard } from '@/components/data/ActivityCard';
import { HealthDayCard } from '@/components/data/HealthDayCard';
import { Colors } from '@/lib/colors';
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
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Zurueck">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </Pressable>
  );
}

function Segmented({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View className="flex-row mx-4 mt-3 p-1 rounded-xl" style={{ backgroundColor: Colors.surfaceNested }}>
      {(['activities', 'health'] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            className="flex-1 py-2 rounded-lg items-center"
            style={{ backgroundColor: active ? Colors.surface : 'transparent' }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: active ? Colors.primary : Colors.textSecondary }}
            >
              {m === 'activities' ? 'Aktivitaeten' : 'Gesundheit'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="px-4 py-2 rounded-full"
      style={{
        backgroundColor: selected ? Colors.primary : Colors.surface,
        borderWidth: 1,
        borderColor: selected ? Colors.primary : Colors.divider,
      }}
    >
      <Text className="text-sm font-medium" style={{ color: selected ? '#FFFFFF' : Colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}
    >
      {children}
    </ScrollView>
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

  const count =
    mode === 'activities' ? activities.activities.length : filteredMetrics.length;

  return (
    <View className="flex-1 bg-background">
      <GradientHeader
        title="Synced Data"
        subtitle={`${count} ${mode === 'activities' ? 'Aktivitaeten' : 'Tage'}`}
        leftContent={<BackButton />}
      />

      <Segmented mode={mode} onChange={setMode} />

      {mode === 'activities' ? (
        <FilterRow>
          <Chip
            label="Alle"
            selected={activities.sportFilter === null}
            onPress={() => activities.setSportFilter(null)}
          />
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

      {error && (
        <View className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-error-light">
          <Text className="text-error text-xs">{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : count === 0 ? (
        <View className="items-center px-8 py-12">
          <Text className="text-text-secondary text-sm text-center">
            Keine Daten. Verbinde Garmin und starte einen Sync in den Einstellungen.
          </Text>
        </View>
      ) : mode === 'activities' ? (
        <FlatList
          data={activities.activities}
          keyExtractor={(item) => item.garmin_activity_id}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => router.push(`/activity/${item.garmin_activity_id}`)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredMetrics}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <HealthDayCard
              metric={item}
              onPress={() =>
                router.push({
                  pathname: '/health/[date]',
                  params: { date: item.date, data: JSON.stringify(item) },
                })
              }
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
