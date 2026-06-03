// SPDX-License-Identifier: MIT
// Seed data for DEMO_MODE.
//
// Shapes match the *return types* of each use-* hook so the demo data flows
// through the exact same UI as the real backend. The plan uses the raw session
// grammar (groups/steps/targets/prescriptions) and is run through the real
// plan-grammar parser, so it renders identically to a real plan.
//
// All dates are computed relative to "today" so the demo always looks current.

import type { UsageSummary } from '../use-usage';
import type { GarminStatus } from '../use-garmin';
import type { Activity } from '../use-activities';
import type { DailyMetric } from '../use-metrics';

// --- date helpers ----------------------------------------------------------
//
// All dates are formatted as LOCAL calendar Y-M-D (not UTC) so they line up
// with how the UI parses them (`new Date(iso + 'T12:00:00')`) regardless of
// timezone. Using toISOString() here would shift dates by a day in
// positive-UTC-offset zones.

function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return localYMD(d);
}

function isoDateTime(offsetDays: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// --- usage -----------------------------------------------------------------

export const DEMO_USAGE: UsageSummary = {
  tier: 'free',
  used: 7,
  limit: 30,
  remaining: 23,
  resetsAt: isoDateTime(12, 0),
  costChat: 1,
  costPlan: 3,
};

// --- garmin status ---------------------------------------------------------

export const DEMO_GARMIN_STATUS: GarminStatus = {
  connected: true,
  display_name: 'Demo Athlete',
  email: 'demo@athletly.app',
  connected_since: isoDateTime(-180, 9),
  last_sync_at: isoDateTime(0, 6, 30),
  activity_count: 6,
  latest_activity_date: isoDate(-1),
};

// --- activities ------------------------------------------------------------

export const DEMO_ACTIVITIES: Activity[] = [
  {
    garmin_activity_id: 'demo-act-1',
    sport: 'running',
    start_time: isoDateTime(-1, 7, 5),
    duration_seconds: 3120,
    distance_meters: 9800,
    avg_hr: 152,
    max_hr: 171,
    calories: 690,
    training_effect: 3.4,
    avg_pace_min_km: 5.31,
    elevation_gain_m: 86,
  },
  {
    garmin_activity_id: 'demo-act-2',
    sport: 'running',
    start_time: isoDateTime(-3, 6, 50),
    duration_seconds: 2640,
    distance_meters: 8000,
    avg_hr: 168,
    max_hr: 184,
    calories: 620,
    training_effect: 4.1,
    avg_pace_min_km: 5.5,
    elevation_gain_m: 42,
  },
  {
    garmin_activity_id: 'demo-act-3',
    sport: 'running',
    start_time: isoDateTime(-5, 7, 15),
    duration_seconds: 5400,
    distance_meters: 16500,
    avg_hr: 144,
    max_hr: 159,
    calories: 1120,
    training_effect: 3.0,
    avg_pace_min_km: 5.45,
    elevation_gain_m: 173,
  },
  {
    garmin_activity_id: 'demo-act-4',
    sport: 'cycling',
    start_time: isoDateTime(-7, 17, 30),
    duration_seconds: 4200,
    distance_meters: 32000,
    avg_hr: 131,
    max_hr: 152,
    calories: 740,
    training_effect: 2.6,
    avg_pace_min_km: null,
    elevation_gain_m: 245,
  },
  {
    garmin_activity_id: 'demo-act-5',
    sport: 'strength_training',
    start_time: isoDateTime(-8, 18, 0),
    duration_seconds: 2700,
    distance_meters: null,
    avg_hr: 112,
    max_hr: 138,
    calories: 310,
    training_effect: 1.8,
    avg_pace_min_km: null,
    elevation_gain_m: null,
  },
  {
    garmin_activity_id: 'demo-act-6',
    sport: 'running',
    start_time: isoDateTime(-10, 7, 0),
    duration_seconds: 2400,
    distance_meters: 7200,
    avg_hr: 138,
    max_hr: 150,
    calories: 470,
    training_effect: 2.3,
    avg_pace_min_km: 5.55,
    elevation_gain_m: 30,
  },
];

export const DEMO_SPORTS: string[] = ['running', 'cycling', 'strength_training'];

/** Extra fields surfaced on the activity detail screen. */
export const DEMO_ACTIVITY_EXTRAS: Record<string, Record<string, number | string>> = {
  'demo-act-1': {
    avg_cadence: 178,
    avg_stride_length_m: 1.06,
    aerobic_training_effect: 3.4,
    anaerobic_training_effect: 0.6,
    avg_power_w: 288,
    vo2max: 52,
  },
  'demo-act-2': {
    avg_cadence: 184,
    avg_stride_length_m: 1.12,
    aerobic_training_effect: 3.2,
    anaerobic_training_effect: 2.1,
    avg_power_w: 312,
  },
};

// --- daily metrics ---------------------------------------------------------

interface MetricSeed {
  rhr: number;
  hrv: number;
  sleepScore: number;
  sleepMin: number;
  stress: number;
  bbHigh: number;
  bbLow: number;
  recovery: number;
  steps: number;
  vo2max: number;
}

const METRIC_SEEDS: MetricSeed[] = [
  { rhr: 48, hrv: 68, sleepScore: 82, sleepMin: 451, stress: 31, bbHigh: 96, bbLow: 22, recovery: 78, steps: 11240, vo2max: 52 },
  { rhr: 46, hrv: 74, sleepScore: 88, sleepMin: 476, stress: 26, bbHigh: 99, bbLow: 34, recovery: 85, steps: 8760, vo2max: 52 },
  { rhr: 50, hrv: 61, sleepScore: 71, sleepMin: 408, stress: 39, bbHigh: 88, bbLow: 18, recovery: 64, steps: 13510, vo2max: 51 },
  { rhr: 47, hrv: 70, sleepScore: 84, sleepMin: 462, stress: 29, bbHigh: 97, bbLow: 28, recovery: 80, steps: 7320, vo2max: 52 },
  { rhr: 45, hrv: 77, sleepScore: 90, sleepMin: 489, stress: 23, bbHigh: 100, bbLow: 40, recovery: 88, steps: 9450, vo2max: 52 },
  { rhr: 49, hrv: 65, sleepScore: 76, sleepMin: 421, stress: 35, bbHigh: 91, bbLow: 20, recovery: 70, steps: 10980, vo2max: 51 },
  { rhr: 47, hrv: 72, sleepScore: 85, sleepMin: 468, stress: 28, bbHigh: 98, bbLow: 30, recovery: 82, steps: 6890, vo2max: 52 },
];

function metricFromSeed(offsetDays: number, s: MetricSeed): DailyMetric {
  const deep = Math.round(s.sleepMin * 0.22);
  const rem = Math.round(s.sleepMin * 0.24);
  const awake = 18;
  const light = s.sleepMin - deep - rem;
  return {
    date: isoDate(offsetDays),
    resting_heart_rate: s.rhr,
    hrv_avg: s.hrv,
    sleep_score: s.sleepScore,
    sleep_duration_minutes: s.sleepMin,
    sleep_deep_minutes: deep,
    sleep_light_minutes: light,
    sleep_rem_minutes: rem,
    sleep_awake_minutes: awake,
    stress_avg: s.stress,
    body_battery_high: s.bbHigh,
    body_battery_low: s.bbLow,
    recovery_score: s.recovery,
    steps: s.steps,
    active_calories: Math.round(s.steps * 0.04) + 220,
    total_calories: 2100 + Math.round(s.steps * 0.05),
    vo2max: s.vo2max,
    intensity_minutes: 40 + (offsetDays % 3) * 15,
    spo2_avg: 96,
    respiration_avg: 14,
  };
}

export const DEMO_METRICS: DailyMetric[] = METRIC_SEEDS.map((s, i) => metricFromSeed(-i, s));
