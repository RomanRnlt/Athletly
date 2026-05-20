import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { WeekStrip } from '@/components/plan/WeekStrip';
import { SessionCard } from '@/components/plan/SessionCard';
import { RestDayCard } from '@/components/plan/RestDayCard';
import { WeeklySummary } from '@/components/plan/WeeklySummary';
import { mockWeeklyPlan } from '@/lib/mock-data';

const GERMAN_MONTHS = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

const GERMAN_DAYS = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch',
  'Donnerstag', 'Freitag', 'Samstag',
] as const;

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = GERMAN_MONTHS[monday.getMonth()];
  const endMonth = GERMAN_MONTHS[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay}. bis ${endDay}. ${startMonth}`;
  }
  return `${startDay}. ${startMonth} bis ${endDay}. ${endMonth}`;
}

function formatDayHeader(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00');
  return `${GERMAN_DAYS[d.getDay()]}, ${d.getDate()}. ${GERMAN_MONTHS[d.getMonth()]}`;
}

function getTodayISO(): string {
  return toLocalISO(new Date());
}

export default function PlanScreen() {
  const plan = mockWeeklyPlan;
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = getTodayISO();
    const match = plan.days.find((d) => d.date === today);
    return match ? today : plan.days[0].date;
  });

  const weekRange = useMemo(() => formatWeekRange(plan.weekStart), [plan.weekStart]);
  const calendarWeek = useMemo(() => getCalendarWeek(plan.weekStart), [plan.weekStart]);
  const selectedDay = plan.days.find((d) => d.date === selectedDate);
  const sessions = selectedDay?.sessions ?? [];

  return (
    <View className="flex-1 bg-background">
      <GradientHeader title="Trainingsplan" subtitle="Diese Woche" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
      >
        <View className="flex-row items-center justify-between px-4 py-2">
          <Button variant="icon" size="sm" icon={ChevronLeft} />
          <View className="items-center">
            <Text className="text-text-primary text-sm font-semibold">{weekRange}</Text>
            <Text className="text-text-muted text-xs mt-0.5">KW {calendarWeek}</Text>
          </View>
          <Button variant="icon" size="sm" icon={ChevronRight} />
        </View>

        <View className="px-4">
          <WeekStrip
            weekStart={plan.weekStart}
            days={plan.days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <Text className="text-text-secondary text-sm font-medium mt-4 mb-3">
            {formatDayHeader(selectedDate)}
          </Text>

          {sessions.length === 0 ? (
            <RestDayCard message={selectedDay?.rest_reason} />
          ) : (
            sessions.map((session) => <SessionCard key={session.id} session={session} />)
          )}

          <View className="mt-4">
            <WeeklySummary plan={plan} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
