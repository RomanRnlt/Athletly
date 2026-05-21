import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { WeekStrip } from '@/components/plan/WeekStrip';
import { SessionCard } from '@/components/plan/SessionCard';
import { RestDayCard } from '@/components/plan/RestDayCard';
import { WeeklySummary } from '@/components/plan/WeeklySummary';
import { usePlan } from '@/lib/use-plan';
import { Colors } from '@/lib/colors';
import type { WeeklyPlan } from '@/types/plan';

const GERMAN_MONTHS = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

const GERMAN_DAYS = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch',
  'Donnerstag', 'Freitag', 'Samstag',
] as const;

function getCalendarWeek(dateISO: string): number {
  const d = new Date(dateISO + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

function formatWeekRange(mondayISO: string): string {
  const monday = new Date(mondayISO + 'T12:00:00');
  const sunday = new Date(mondayISO + 'T12:00:00');
  sunday.setDate(sunday.getDate() + 6);
  const startMonth = GERMAN_MONTHS[monday.getMonth()];
  const endMonth = GERMAN_MONTHS[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}. bis ${sunday.getDate()}. ${startMonth}`;
  }
  return `${monday.getDate()}. ${startMonth} bis ${sunday.getDate()}. ${endMonth}`;
}

function formatDayHeader(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00');
  return `${GERMAN_DAYS[d.getDay()]}, ${d.getDate()}. ${GERMAN_MONTHS[d.getMonth()]}`;
}

function PlanContent({ weeks }: { weeks: WeeklyPlan[] }) {
  const [weekIndex, setWeekIndex] = useState(0);
  const week = weeks[Math.min(weekIndex, weeks.length - 1)];

  const [selectedDate, setSelectedDate] = useState<string>(week.days[0]?.date ?? '');

  // When switching weeks, snap selection to that week's first day.
  useEffect(() => {
    setSelectedDate(week.days[0]?.date ?? '');
  }, [week]);

  const weekRange = useMemo(() => formatWeekRange(week.weekStart), [week.weekStart]);
  const calendarWeek = useMemo(() => getCalendarWeek(week.weekStart), [week.weekStart]);
  const selectedDay = week.days.find((d) => d.date === selectedDate);
  const sessions = selectedDay?.sessions ?? [];

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-8"
    >
      <View className="flex-row items-center justify-between px-4 py-2">
        <Button
          variant="icon"
          size="sm"
          icon={ChevronLeft}
          disabled={weekIndex === 0}
          onPress={() => setWeekIndex((i) => Math.max(0, i - 1))}
        />
        <View className="items-center">
          <Text className="text-text-primary text-sm font-semibold">{weekRange}</Text>
          <Text className="text-text-muted text-xs mt-0.5">
            KW {calendarWeek} · Woche {weekIndex + 1}/{weeks.length}
          </Text>
        </View>
        <Button
          variant="icon"
          size="sm"
          icon={ChevronRight}
          disabled={weekIndex >= weeks.length - 1}
          onPress={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
        />
      </View>

      <View className="px-4">
        <WeekStrip
          weekStart={week.weekStart}
          days={week.days}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <Text className="text-text-secondary text-sm font-medium mt-4 mb-3">
          {selectedDate ? formatDayHeader(selectedDate) : ''}
        </Text>

        {sessions.length === 0 ? (
          <RestDayCard message={selectedDay?.rest_reason} />
        ) : (
          sessions.map((session) => <SessionCard key={session.id} session={session} />)
        )}

        <View className="mt-4">
          <WeeklySummary plan={week} />
        </View>
      </View>
    </ScrollView>
  );
}

function EmptyPlan() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <CalendarDays size={40} color={Colors.textMuted} strokeWidth={1.5} />
      <Text className="text-text-primary text-base font-medium mt-4 mb-2">
        Noch kein Trainingsplan
      </Text>
      <Text className="text-text-secondary text-sm text-center leading-5">
        Sag Ohm im Chat dass du einen Plan willst. Er recherchiert und baut dir
        einen wissenschaftlich fundierten 2-Wochen-Plan, den du dann gemeinsam
        mit ihm anpassen kannst.
      </Text>
    </View>
  );
}

export default function PlanScreen() {
  const { weeks, status, hasPlan, isLoading, error } = usePlan();

  const subtitle =
    status === 'draft' ? 'Entwurf - im Chat bestaetigen' : 'Dein aktiver Plan';

  return (
    <View className="flex-1 bg-background">
      <GradientHeader title="Trainingsplan" subtitle={hasPlan ? subtitle : undefined} />

      {error && (
        <View className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-error-light">
          <Text className="text-error text-xs">{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : !hasPlan || weeks.length === 0 ? (
        <EmptyPlan />
      ) : (
        <PlanContent weeks={weeks} />
      )}
    </View>
  );
}
