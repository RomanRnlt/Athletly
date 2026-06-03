'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/(tabs)/plan.tsx. useFocusEffect refetch becomes a
// window-focus listener so a plan created in the chat shows up on return.
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Moon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { WeekStrip } from '@/components/plan/WeekStrip';
import { SessionCard } from '@/components/plan/SessionCard';
import { RestDayCard } from '@/components/plan/RestDayCard';
import { WeeklySummary } from '@/components/plan/WeeklySummary';
import { usePlan } from '@/lib/use-plan';
import { Colors } from '@athletly/shared';
import type { WeeklyPlan } from '@athletly/shared';

const GERMAN_MONTHS = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

const GERMAN_DAYS = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag',
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

function isToday(dateISO: string): boolean {
  const d = new Date(dateISO + 'T12:00:00');
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// Desktop-only: one column per training day, showing that day's sessions (or a
// compact rest state). Used in the responsive week grid.
function DayColumn({ day }: { day: WeeklyPlan['days'][number] }) {
  const d = new Date(day.date + 'T12:00:00');
  const today = isToday(day.date);
  const sessions = day.sessions ?? [];

  return (
    <div
      className={[
        'flex flex-col rounded-2xl border bg-surface/60 p-3',
        today ? 'border-primary/40 ring-1 ring-primary/20' : 'border-divider',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between mb-2 px-1">
        <span className="text-text-primary text-sm font-semibold">
          {GERMAN_DAYS[d.getDay()]}
        </span>
        <span
          className={[
            'text-xs font-medium',
            today ? 'text-primary' : 'text-text-muted',
          ].join(' ')}
        >
          {d.getDate()}. {GERMAN_MONTHS[d.getMonth()].slice(0, 3)}
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 rounded-xl bg-surface-nested">
          <Moon size={22} color={Colors.textMuted} strokeWidth={1.5} />
          <span className="text-text-muted text-xs mt-2">Ruhetag</span>
        </div>
      ) : (
        <div className="flex flex-col">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanContent({ weeks }: { weeks: WeeklyPlan[] }) {
  const [weekIndex, setWeekIndex] = useState(0);
  const week = weeks[Math.min(weekIndex, weeks.length - 1)];

  const [selectedDate, setSelectedDate] = useState<string>(week.days[0]?.date ?? '');

  useEffect(() => {
    setSelectedDate(week.days[0]?.date ?? '');
  }, [week]);

  const weekRange = useMemo(() => formatWeekRange(week.weekStart), [week.weekStart]);
  const calendarWeek = useMemo(() => getCalendarWeek(week.weekStart), [week.weekStart]);
  const selectedDay = week.days.find((d) => d.date === selectedDate);
  const sessions = selectedDay?.sessions ?? [];

  const weekNav = (
    <div className="flex flex-row items-center justify-between px-4 py-2 md:px-0 md:py-0">
      <Button
        variant="icon"
        size="sm"
        icon={ChevronLeft}
        disabled={weekIndex === 0}
        onPress={() => setWeekIndex((i) => Math.max(0, i - 1))}
      />
      <div className="flex flex-col items-center md:items-start md:flex-1 md:px-4">
        <span className="text-text-primary text-sm md:text-lg font-semibold">{weekRange}</span>
        <span className="text-text-muted text-xs mt-0.5">
          KW {calendarWeek} · Woche {weekIndex + 1}/{weeks.length}
        </span>
      </div>
      <Button
        variant="icon"
        size="sm"
        icon={ChevronRight}
        disabled={weekIndex >= weeks.length - 1}
        onPress={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
      />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-8 md:pb-12">
      {/* MOBILE: week strip + selected-day list (1:1 with the source app). */}
      <div className="md:hidden">
        {weekNav}
        <div className="px-4">
          <WeekStrip
            weekStart={week.weekStart}
            days={week.days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <p className="text-text-secondary text-sm font-medium mt-4 mb-3">
            {selectedDate ? formatDayHeader(selectedDate) : ''}
          </p>

          {sessions.length === 0 ? (
            <RestDayCard message={selectedDay?.rest_reason} />
          ) : (
            sessions.map((session) => <SessionCard key={session.id} session={session} />)
          )}

          <div className="mt-4">
            <WeeklySummary plan={week} />
          </div>
        </div>
      </div>

      {/* DESKTOP: full-week grid + a sticky weekly summary rail. */}
      <div className="hidden md:block mx-auto w-full max-w-6xl px-10 pt-7">
        <div className="mb-6">{weekNav}</div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {week.days.map((day) => (
              <DayColumn key={day.date} day={day} />
            ))}
          </div>
          <div className="lg:sticky lg:top-7">
            <WeeklySummary plan={week} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyPlan() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <CalendarDays size={40} color={Colors.textMuted} strokeWidth={1.5} />
      <p className="text-text-primary text-base font-medium mt-4 mb-2">Noch kein Trainingsplan</p>
      <p className="text-text-secondary text-sm text-center leading-5">
        Sag Ohm im Chat dass du einen Plan willst. Er recherchiert und baut dir einen
        wissenschaftlich fundierten 2-Wochen-Plan, den du dann gemeinsam mit ihm anpassen kannst.
      </p>
    </div>
  );
}

export default function PlanScreen() {
  const { weeks, status, hasPlan, isLoading, error, refresh } = usePlan();

  // Refetch when the window/tab regains focus (web analogue of useFocusEffect).
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const subtitle = status === 'draft' ? 'Entwurf - im Chat bestaetigen' : 'Dein aktiver Plan';

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <GradientHeader
        title="Trainingsplan"
        subtitle={hasPlan ? subtitle : undefined}
        contentMaxWidthClass="md:max-w-6xl"
      />

      {error && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-error-light">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <span
            className="inline-block h-6 w-6 rounded-full border-4 border-transparent animate-spin"
            style={{ borderTopColor: Colors.primary, borderRightColor: Colors.primary }}
          />
        </div>
      ) : !hasPlan || weeks.length === 0 ? (
        <EmptyPlan />
      ) : (
        <PlanContent weeks={weeks} />
      )}
    </div>
  );
}
