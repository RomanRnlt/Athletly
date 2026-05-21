import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Clock, MapPin, Heart, Mountain, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/lib/colors';
import { getSportColor } from '@/lib/sport-colors';
import { getSportIcon, getSportLabel } from '@/lib/sport-icons';
import type { Activity } from '@/lib/use-activities';

const PACE_SPORTS = new Set(['running', 'trail_running', 'treadmill_running', 'hiking']);

export function fmtDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtPace(pace: number | null): string | null {
  if (pace === null || pace <= 0) return null;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function fmtActivityDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
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

export function ActivityCard({
  activity,
  onPress,
}: {
  activity: Activity;
  onPress?: () => void;
}) {
  const sport = (activity.sport || 'unknown').toLowerCase();
  const color = getSportColor(sport);
  const Icon = getSportIcon(sport);
  const distanceKm = activity.distance_meters
    ? `${(activity.distance_meters / 1000).toFixed(2)} km`
    : null;
  const pace = PACE_SPORTS.has(sport) ? fmtPace(activity.avg_pace_min_km) : null;
  const duration = fmtDuration(activity.duration_seconds);

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-2xl mb-3 overflow-hidden"
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      })}
      accessibilityRole="button"
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
            <Text className="text-text-muted text-xs mt-0.5">
              {fmtActivityDate(activity.start_time)}
            </Text>
          </View>
          {onPress && <ChevronRight size={18} color={Colors.textMuted} />}
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
    </Pressable>
  );
}

export default ActivityCard;
