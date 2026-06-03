'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/data/ActivityCard.tsx. Exported format helpers
// are reused by the activity detail page (same as mobile).
import React from 'react';
import { Clock, MapPin, Heart, Mountain, ChevronRight, type LucideIcon } from 'lucide-react';
import { Colors } from '@athletly/shared';
import { getSportColor } from '@/lib/sport-colors';
import { getSportIcon, getSportLabel } from '@/lib/sport-icons';
import type { Activity } from '@/lib/use-activities';
import { useI18n } from '@/i18n';

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

export function fmtActivityDate(intlLocale: string, iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(intlLocale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function Metric({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="flex flex-row items-center gap-1">
      <Icon size={13} color={Colors.textMuted} strokeWidth={2} />
      <span className="text-text-secondary text-xs">{text}</span>
    </span>
  );
}

export function ActivityCard({ activity, onPress }: { activity: Activity; onPress?: () => void }) {
  const { t, intlLocale } = useI18n();
  const sport = (activity.sport || 'unknown').toLowerCase();
  const color = getSportColor(sport);
  const Icon = getSportIcon(sport);
  const distanceKm = activity.distance_meters
    ? `${(activity.distance_meters / 1000).toFixed(2)} km`
    : null;
  const pace = PACE_SPORTS.has(sport) ? fmtPace(activity.avg_pace_min_km) : null;
  const duration = fmtDuration(activity.duration_seconds);

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left bg-surface rounded-2xl mb-3 overflow-hidden transition-opacity hover:opacity-90"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div style={{ height: 3, backgroundColor: color }} />
      <div className="p-4">
        <div className="flex flex-row items-center mb-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mr-3 shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={18} color={color} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-text-primary text-base font-semibold">{getSportLabel(t, sport)}</p>
            <p className="text-text-muted text-xs mt-0.5">{fmtActivityDate(intlLocale, activity.start_time)}</p>
          </div>
          {onPress && <ChevronRight size={18} color={Colors.textMuted} />}
        </div>

        <div className="flex flex-row flex-wrap gap-x-4 gap-y-1">
          {duration && <Metric icon={Clock} text={duration} />}
          {distanceKm && <Metric icon={MapPin} text={distanceKm} />}
          {pace && <Metric icon={Clock} text={pace} />}
          {activity.avg_hr ? <Metric icon={Heart} text={`${activity.avg_hr} bpm`} /> : null}
          {activity.elevation_gain_m ? (
            <Metric icon={Mountain} text={`${Math.round(activity.elevation_gain_m)} hm`} />
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default ActivityCard;
