'use client';

// Web port of mobile/components/plan/WeeklySummary.tsx.
import React, { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/lib/colors';
import { getSportColor } from '@/lib/sport-colors';
import { getSportLabel } from '@/lib/sport-icons';
import type { WeeklyPlan, PlannedSession } from '@/types/plan';

function formatTotalDuration(minutes: number): string {
  if (minutes <= 0) return '0min';
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

export function WeeklySummary({ plan }: { plan: WeeklyPlan }) {
  const allSessions = useMemo(() => getAllSessions(plan), [plan]);
  const distribution = useMemo(() => buildSportDistribution(plan), [plan]);
  const totalSessions = allSessions.length;
  const totalDuration = allSessions.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return (
    <Card variant="standard" className="mb-4">
      <p className="text-text-primary text-lg font-semibold mb-3">Wochenuebersicht</p>

      <div className="flex flex-col gap-2 mb-3">
        {distribution.map(({ sport, count }) => (
          <div key={sport} className="flex flex-row items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getSportColor(sport) }} />
            <span className="text-text-secondary text-sm flex-1">{getSportLabel(sport)}</span>
            <span className="text-text-muted text-sm">{count}x</span>
          </div>
        ))}
      </div>

      <div className="border-t border-divider pt-3 mb-3">
        <p className="text-text-primary text-sm font-medium">
          {totalSessions} Einheiten{totalDuration > 0 ? ` / ca. ${formatTotalDuration(totalDuration)}` : ''}
        </p>
      </div>

      {plan.coachMessage ? (
        <div className="rounded-lg p-3" style={{ backgroundColor: '#F5F6F8' }}>
          <div className="flex flex-row items-start gap-2">
            <MessageCircle size={14} color={Colors.textMuted} strokeWidth={2} />
            <p className="text-text-secondary text-sm italic flex-1 leading-5">{plan.coachMessage}</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default WeeklySummary;
