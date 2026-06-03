'use client';

// Web port of mobile/components/plan/WeekStrip.tsx. react-native-svg -> SVG;
// the progress ring math is identical.
import React from 'react';
import { Moon } from 'lucide-react';
import { getSportColor } from '@/lib/sport-colors';
import { getSportIcon } from '@/lib/sport-icons';
import { Colors } from '@athletly/shared';
import type { DayPlan, PlannedSession } from '@athletly/shared';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

const RING_SIZE = 38;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TRACK_COLOR = '#E2E8F0';

interface WeekStripProps {
  weekStart: string;
  days: readonly DayPlan[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateForDay(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + dayIndex);
  return toLocalISO(d);
}

function getTodayISO(): string {
  return toLocalISO(new Date());
}

function getDayPlanForDate(days: readonly DayPlan[], date: string): DayPlan | undefined {
  return days.find((d) => d.date === date);
}

function getDayRingColor(sessions: readonly PlannedSession[]): string {
  if (sessions.length === 0) return Colors.primary;
  return getSportColor(sessions[0].sport);
}

interface ProgressRingProps {
  readonly size: number;
  readonly progress: number;
  readonly ringColor: string;
  readonly isRest: boolean;
  readonly sessions: readonly PlannedSession[];
}

function ProgressRing({ size, progress, ringColor, isRest, sessions }: ProgressRingProps) {
  const center = size / 2;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = RING_CIRCUMFERENCE * (1 - clamped / 100);
  const SportIcon = sessions.length > 0 ? getSportIcon(sessions[0].sport) : null;
  const iconColor = sessions.length > 0 ? getSportColor(sessions[0].sport) : Colors.textSecondary;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={center} cy={center} r={RING_RADIUS} stroke={TRACK_COLOR} strokeWidth={RING_STROKE} fill="none" />
        {clamped > 0 && (
          <circle
            cx={center}
            cy={center}
            r={RING_RADIUS}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </svg>
      <div className="absolute flex items-center justify-center">
        {isRest ? (
          <Moon size={14} color={Colors.textMuted} strokeWidth={2} />
        ) : SportIcon ? (
          <SportIcon size={16} color={iconColor} strokeWidth={2} />
        ) : null}
      </div>
    </div>
  );
}

export function WeekStrip({ weekStart, days, selectedDate, onSelectDate }: WeekStripProps) {
  const today = getTodayISO();

  return (
    <div className="flex flex-row justify-between px-1 py-2">
      {DAY_LABELS.map((label, index) => {
        const date = getDateForDay(weekStart, index);
        const dayNumber = new Date(date + 'T12:00:00').getDate();
        const isToday = date === today;
        const isSelected = date === selectedDate;
        const dayPlan = getDayPlanForDate(days, date);
        const daySessions = dayPlan?.sessions ?? [];
        const isRest = daySessions.length === 0;
        const ringColor = getDayRingColor(daySessions);
        const completionPct = Math.round((dayPlan?.completion ?? 0) * 100);

        return (
          <button
            type="button"
            key={date}
            onClick={() => onSelectDate(date)}
            className="flex flex-col items-center py-2 px-1 rounded-xl flex-1 mx-0.5"
            style={isSelected ? { backgroundColor: `${Colors.primary}1A` } : undefined}
            aria-label={`${label} ${dayNumber}`}
          >
            <span
              className="text-xs font-medium mb-1"
              style={{ color: isToday ? Colors.primary : Colors.textSecondary }}
            >
              {label}
            </span>

            <ProgressRing
              size={RING_SIZE}
              progress={completionPct}
              ringColor={ringColor}
              isRest={isRest}
              sessions={daySessions}
            />

            <span className="text-[10px] mt-1" style={{ color: isToday ? Colors.primary : Colors.textMuted }}>
              {isToday ? 'Heute' : dayNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default WeekStrip;
