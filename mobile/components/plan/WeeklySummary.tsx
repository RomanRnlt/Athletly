import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/lib/colors';
import { getSportColor } from '@/lib/sport-colors';
import { getSportLabel } from '@/lib/sport-icons';
import type { WeeklyPlan, PlannedSession } from '@/types/plan';

interface WeeklySummaryProps {
  plan: WeeklyPlan;
}

function formatTotalDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getAllSessions(plan: WeeklyPlan): readonly PlannedSession[] {
  return plan.days.flatMap((day) => day.sessions);
}

function buildSportDistribution(plan: WeeklyPlan): Array<{ sport: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const session of getAllSessions(plan)) {
    const key = session.sport.toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count);
}

export function WeeklySummary({ plan }: WeeklySummaryProps) {
  const allSessions = useMemo(() => getAllSessions(plan), [plan]);
  const distribution = useMemo(() => buildSportDistribution(plan), [plan]);
  const totalSessions = allSessions.length;
  const totalDuration = allSessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <Card variant="standard" className="mb-4">
      <Text className="text-text-primary text-lg font-semibold mb-3">Wochenuebersicht</Text>

      <View className="gap-2 mb-3">
        {distribution.map(({ sport, count }) => (
          <View key={sport} className="flex-row items-center gap-2">
            <View
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getSportColor(sport) }}
            />
            <Text className="text-text-secondary text-sm flex-1">{getSportLabel(sport)}</Text>
            <Text className="text-text-muted text-sm">{count}x</Text>
          </View>
        ))}
      </View>

      <View className="border-t border-divider pt-3 mb-3">
        <Text className="text-text-primary text-sm font-medium">
          {totalSessions} Einheiten / {formatTotalDuration(totalDuration)}
        </Text>
      </View>

      {plan.coachMessage ? (
        <View className="rounded-lg p-3" style={{ backgroundColor: '#F5F6F8' }}>
          <View className="flex-row items-start gap-2">
            <MessageCircle size={14} color={Colors.textMuted} strokeWidth={2} />
            <Text className="text-text-secondary text-sm italic flex-1 leading-5">
              {plan.coachMessage}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export default WeeklySummary;
