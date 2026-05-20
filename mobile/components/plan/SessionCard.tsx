import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/lib/colors';
import { getSportColor } from '@/lib/sport-colors';
import { getSportLabel } from '@/lib/sport-icons';
import type { PlannedSession } from '@/types/plan';

interface SessionCardProps {
  session: PlannedSession;
}

const INTENSITY_LABELS: Record<string, string> = {
  easy: 'Leicht',
  recovery: 'Leicht',
  low: 'Leicht',
  moderate: 'Moderat',
  tempo: 'Moderat',
  steady: 'Moderat',
  high: 'Intensiv',
  hard: 'Intensiv',
  threshold: 'Intensiv',
};

function getIntensityLabel(raw: string): string {
  return INTENSITY_LABELS[raw.trim().toLowerCase()] ?? 'Moderat';
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  intervals: 'Intervalle',
  tempo: 'Tempo',
  long_run: 'Langer Lauf',
  easy_run: 'Lockerer Lauf',
  recovery: 'Erholung',
  strength: 'Kraft',
  endurance: 'Ausdauer',
  race: 'Wettkampf',
};

function getSessionTypeLabel(sessionType: string): string {
  const key = sessionType.trim().toLowerCase().replace(/\s+/g, '_');
  return SESSION_TYPE_LABELS[key] ?? sessionType;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function SessionCard({ session }: SessionCardProps) {
  const sportColor = getSportColor(session.sport);
  const intensityLabel = getIntensityLabel(session.intensity);
  const typeLabel = getSessionTypeLabel(session.session_type);
  const sportLabel = getSportLabel(session.sport);

  return (
    <View style={styles.card} className="bg-surface mb-3">
      <View style={[styles.accentBar, { backgroundColor: sportColor }]} />

      <View className="p-4">
        <View className="flex-row items-center justify-between mt-1 mb-2">
          <View className="flex-row items-center gap-2">
            <Badge type="sport" sport={session.sport} label={sportLabel} />
            <Text className="text-xs font-medium" style={{ color: Colors.textMuted }}>
              {typeLabel}
            </Text>
          </View>
          <Badge type="intensity" intensity={session.intensity} label={intensityLabel} />
        </View>

        <Text className="text-sm mb-3 leading-5" style={{ color: Colors.textSecondary }}>
          {session.description}
        </Text>

        <View className="flex-row items-center gap-1.5">
          <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text className="text-sm" style={{ color: Colors.textSecondary }}>
            {formatDuration(session.duration_minutes)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    height: 3,
  },
});

export default SessionCard;
