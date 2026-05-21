import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Clock, MapPin, Heart, Mountain } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Colors } from '@/lib/colors';
import { getSportColor } from '@/lib/sport-colors';
import { getSportIcon, getSportLabel } from '@/lib/sport-icons';
import { useActivities, type Activity } from '@/lib/use-activities';

const PACE_SPORTS = new Set(['running', 'trail_running', 'treadmill_running', 'hiking']);

function fmtDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtPace(pace: number | null): string | null {
  if (pace === null || pace <= 0) return null;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function BackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Zurueck">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </Pressable>
  );
}

function Metric({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <Icon size={13} color={Colors.textMuted} strokeWidth={2} />
      <Text className="text-text-secondary text-xs">{text}</Text>
    </View>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const sport = (activity.sport || 'unknown').toLowerCase();
  const color = getSportColor(sport);
  const Icon = getSportIcon(sport);
  const distanceKm = activity.distance_meters
    ? `${(activity.distance_meters / 1000).toFixed(2)} km`
    : null;
  const pace = PACE_SPORTS.has(sport) ? fmtPace(activity.avg_pace_min_km) : null;
  const duration = fmtDuration(activity.duration_seconds);

  return (
    <View
      className="bg-surface rounded-2xl mb-3 overflow-hidden"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View style={{ height: 3, backgroundColor: color }} />
      <View className="p-4">
        <View className="flex-row items-center mb-2">
          <View
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={18} color={color} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary text-base font-semibold">
              {getSportLabel(sport)}
            </Text>
            <Text className="text-text-muted text-xs mt-0.5">{fmtDate(activity.start_time)}</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {duration && <Metric icon={Clock} text={duration} />}
          {distanceKm && <Metric icon={MapPin} text={distanceKm} />}
          {pace && <Metric icon={Clock} text={pace} />}
          {activity.avg_hr ? <Metric icon={Heart} text={`${activity.avg_hr} bpm`} /> : null}
          {activity.elevation_gain_m
            ? <Metric icon={Mountain} text={`${Math.round(activity.elevation_gain_m)} hm`} />
            : null}
        </View>
      </View>
    </View>
  );
}

function FilterChips({
  sports,
  active,
  onSelect,
}: {
  sports: string[];
  active: string | null;
  onSelect: (sport: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}
    >
      <Chip label="Alle" selected={active === null} onPress={() => onSelect(null)} />
      {sports.map((s) => (
        <Chip
          key={s}
          label={getSportLabel(s)}
          selected={active === s}
          onPress={() => onSelect(s)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
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
      <Text
        className="text-sm font-medium"
        style={{ color: selected ? '#FFFFFF' : Colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ActivitiesScreen() {
  const { activities, sports, isLoading, error, sportFilter, setSportFilter } = useActivities();

  return (
    <View className="flex-1 bg-background">
      <GradientHeader
        title="Aktivitaeten"
        subtitle={`${activities.length} Eintraege`}
        leftContent={<BackButton />}
      />

      <FilterChips sports={sports} active={sportFilter} onSelect={setSportFilter} />

      {error && (
        <View className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-error-light">
          <Text className="text-error text-xs">{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : activities.length === 0 ? (
        <View className="items-center px-8 py-12">
          <Text className="text-text-secondary text-sm text-center">
            Keine Aktivitaeten{sportFilter ? ' fuer diesen Filter' : ''}. Verbinde Garmin und
            starte einen Sync in den Einstellungen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.garmin_activity_id}
          renderItem={({ item }) => <ActivityCard activity={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
