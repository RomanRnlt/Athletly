'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/data/HealthDayCard.tsx. Exported helpers
// (fmtHealthDate, fmtSleepDuration, scoreColor, metricChips) reused by the
// health detail page.
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Colors } from '@athletly/shared';
import type { DailyMetric } from '@/lib/use-metrics';

export function fmtHealthDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
}

export function fmtSleepDuration(min: number | null): string | null {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}min`;
}

export function scoreColor(score: number | null): string {
  if (score === null) return Colors.textMuted;
  if (score >= 80) return Colors.success;
  if (score >= 60) return Colors.primary;
  if (score >= 40) return Colors.warning;
  return Colors.error;
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: Colors.surfaceNested, minWidth: 84 }}>
      <p className="text-text-muted text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-text-primary text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

export function metricChips(m: DailyMetric): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [];
  if (m.recovery_score !== null) chips.push({ label: 'Recovery', value: `${m.recovery_score}` });
  if (m.hrv_avg !== null) chips.push({ label: 'HRV', value: `${Math.round(m.hrv_avg)} ms` });
  if (m.resting_heart_rate !== null) chips.push({ label: 'Ruhe-HF', value: `${m.resting_heart_rate} bpm` });
  if (m.body_battery_high !== null) {
    const low = m.body_battery_low !== null ? `-${m.body_battery_low}` : '';
    chips.push({ label: 'Body Battery', value: `${m.body_battery_high}${low}` });
  }
  if (m.stress_avg !== null) chips.push({ label: 'Stress', value: `${m.stress_avg}` });
  if (m.spo2_avg !== null) chips.push({ label: 'SpO2', value: `${Math.round(m.spo2_avg)}%` });
  if (m.respiration_avg !== null) chips.push({ label: 'Atmung', value: `${Math.round(m.respiration_avg)}/min` });
  if (m.vo2max !== null) chips.push({ label: 'VO2max', value: `${Math.round(m.vo2max)}` });
  if (m.steps !== null) chips.push({ label: 'Schritte', value: m.steps.toLocaleString('de-DE') });
  if (m.intensity_minutes !== null) chips.push({ label: 'Intensitaet', value: `${m.intensity_minutes} min` });
  return chips;
}

export function HealthDayCard({ metric, onPress }: { metric: DailyMetric; onPress?: () => void }) {
  const sleepDuration = fmtSleepDuration(metric.sleep_duration_minutes);
  const chips = metricChips(metric);

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left bg-surface rounded-2xl mb-3 p-4 transition-opacity hover:opacity-90"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex flex-row items-center justify-between mb-3">
        <p className="text-text-primary text-base font-semibold">{fmtHealthDate(metric.date)}</p>
        <div className="flex flex-row items-center gap-1.5">
          {metric.sleep_score !== null && (
            <>
              <span className="text-text-muted text-xs">Schlaf</span>
              <span className="text-base font-bold" style={{ color: scoreColor(metric.sleep_score) }}>
                {metric.sleep_score}
              </span>
              {sleepDuration && <span className="text-text-muted text-xs">({sleepDuration})</span>}
            </>
          )}
          {onPress && <ChevronRight size={18} color={Colors.textMuted} />}
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-row flex-wrap gap-2">
          {chips.map((c) => (
            <MetricChip key={c.label} label={c.label} value={c.value} />
          ))}
        </div>
      ) : (
        <p className="text-text-muted text-xs">Keine Werte fuer diesen Tag.</p>
      )}
    </button>
  );
}

export default HealthDayCard;
