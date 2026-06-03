// SPDX-License-Identifier: MIT
// Seed data for DEMO_MODE.
//
// Shapes match the *return types* of each use-* hook so the demo data flows
// through the exact same UI as the real backend. The plan uses the raw session
// grammar (groups/steps/targets/prescriptions) and is run through the real
// plan-grammar parser, so it renders identically to a real plan.
//
// All dates are computed relative to "today" so the demo always looks current.

import type { WeeklyPlan } from '@athletly/shared';
import { parseSession } from '../plan-grammar';
import type { ProfileSection } from '../use-profile';
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

/** Monday of the week containing `today + offsetWeeks` weeks. */
function weekStart(offsetWeeks: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const mondayDelta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayDelta + offsetWeeks * 7);
  return localYMD(d);
}

// --- athlete profile -------------------------------------------------------

export const DEMO_PROFILE_SECTIONS: ProfileSection[] = [
  {
    name: 'Ziele',
    content:
      'Halbmarathon in 1:35 in ~10 Wochen. Mittelfristig sub-1:30. Dabei gesund und konsistent bleiben, nicht ausbrennen.',
    empty: false,
  },
  {
    name: 'Trainingshistorie',
    content:
      'Laeuft seit 4 Jahren, aktuell 4x pro Woche, ~45 km Wochenvolumen. Letzte 10k-Bestzeit 42:10. Hat schon zwei Halbmarathons finished (beste Zeit 1:41).',
    empty: false,
  },
  {
    name: 'Verfuegbarkeit',
    content:
      'Mo/Mi/Fr morgens vor der Arbeit (~60 min), Sonntag fuer den langen Lauf (bis 2 Std). Dienstag/Donnerstag eher Ruhe oder Krafttraining.',
    empty: false,
  },
  {
    name: 'Gesundheit & Einschraenkungen',
    content:
      'Leichte Probleme mit der rechten Achillessehne in der Vergangenheit. Reagiert empfindlich auf zu schnelle Umfangsteigerungen. Sonst keine Einschraenkungen.',
    empty: false,
  },
  {
    name: 'Praeferenzen',
    content:
      'Mag strukturierte Intervalle und klare Pace-Vorgaben. Laeuft am liebsten morgens. Mag keine reinen Tempolaeufe ohne Aufwaermen.',
    empty: false,
  },
];

export const DEMO_PROFILE = {
  sections: DEMO_PROFILE_SECTIONS,
  is_empty: false,
  onboarding_completed: true,
  filled_sections: DEMO_PROFILE_SECTIONS.length,
};

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
    note: 'Threshold-Intervalle 4x1500m',
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

// --- training plan (2 weeks) ----------------------------------------------
//
// Raw session grammar (matches the backend /plan response). Parsed via
// parseSession so estimatedMinutes/done are derived exactly like production.

interface RawSession {
  sport: string;
  intent: string;
  headline: string;
  load: number;
  status?: string;
  groups: unknown[];
}

function easyRun(headline: string, minutes: number, pace: string, load: number): RawSession {
  return {
    sport: 'running',
    intent: 'aerobic_base',
    headline,
    load,
    groups: [
      {
        mode: 'fixed',
        label: 'Dauerlauf',
        rounds: 1,
        steps: [
          {
            role: 'work',
            target: { kind: 'time', amount: minutes * 60, unit: 'min' },
            prescription: { kind: 'pace', value: pace },
            movement: '',
            note: 'Locker und gleichmaessig, Gespraechstempo.',
          },
        ],
      },
    ],
  };
}

function intervalRun(): RawSession {
  return {
    sport: 'running',
    intent: 'threshold',
    headline: 'Schwellen-Intervalle 4x1500m',
    load: 78,
    groups: [
      {
        mode: 'fixed',
        label: 'Warmup',
        rounds: 1,
        steps: [
          {
            role: 'warmup',
            target: { kind: 'time', amount: 720, unit: 'min' },
            prescription: { kind: 'pace', value: '5:50/km' },
            movement: '',
            note: 'Locker einlaufen + 3 Steigerungen.',
          },
        ],
      },
      {
        mode: 'fixed',
        label: '4x 1500m @ Schwelle',
        rounds: 4,
        steps: [
          {
            role: 'work',
            target: { kind: 'distance', amount: 1500, unit: 'm' },
            prescription: { kind: 'pace', value: '4:25/km', rng: [262, 268] },
            movement: '',
            note: 'Kontrolliert hart, gleichmaessig.',
          },
          {
            role: 'recovery',
            target: { kind: 'time', amount: 150, unit: 'min' },
            prescription: { kind: 'hr', value: '<140bpm' },
            movement: '',
            note: 'Trabpause.',
          },
        ],
      },
      {
        mode: 'fixed',
        label: 'Cooldown',
        rounds: 1,
        steps: [
          {
            role: 'cooldown',
            target: { kind: 'time', amount: 600, unit: 'min' },
            prescription: { kind: 'pace', value: '6:00/km' },
            movement: '',
            note: 'Locker auslaufen.',
          },
        ],
      },
    ],
  };
}

function longRun(km: number): RawSession {
  return {
    sport: 'running',
    intent: 'aerobic_base',
    headline: `Langer Lauf ${km} km`,
    load: 95,
    groups: [
      {
        mode: 'fixed',
        label: 'Long Run',
        rounds: 1,
        steps: [
          {
            role: 'work',
            target: { kind: 'distance', amount: km * 1000, unit: 'km' },
            prescription: { kind: 'pace', value: '5:35/km', rng: [325, 345] },
            movement: '',
            note: 'Aerobe Ausdauer, letzte 3 km leicht progressiv.',
          },
        ],
      },
    ],
  };
}

function strength(): RawSession {
  return {
    sport: 'strength_training',
    intent: 'strength',
    headline: 'Lauf-Kraft & Stabi',
    load: 40,
    groups: [
      {
        mode: 'fixed',
        label: 'Kraftzirkel',
        rounds: 3,
        steps: [
          { role: 'work', target: { kind: 'reps', amount: 12, unit: 'reps' }, prescription: { kind: 'load', value: '40kg' }, movement: 'Kniebeuge', note: '' },
          { role: 'work', target: { kind: 'reps', amount: 10, unit: 'reps' }, prescription: { kind: 'none', value: null }, movement: 'Ausfallschritte', note: 'Pro Seite.' },
          { role: 'work', target: { kind: 'time', amount: 45, unit: 'min' }, prescription: { kind: 'none', value: null }, movement: 'Plank', note: '' },
        ],
      },
    ],
  };
}

interface RawDay {
  date: string;
  sessions: unknown[];
  rest_reason?: string;
  completion?: number | null;
}

function buildWeek(offsetWeeks: number, coachMessage: string, sessions: (RawSession | null)[]): WeeklyPlan {
  const start = weekStart(offsetWeeks);
  const startDate = new Date(`${start}T00:00:00`);
  const days: RawDay[] = sessions.map((session, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const date = localYMD(d);
    const isPast = d.getTime() < Date.now() - 86_400_000;
    if (session === null) {
      return { date, sessions: [], rest_reason: 'Ruhetag / aktive Erholung', completion: null };
    }
    return {
      date,
      sessions: [{ ...session, status: isPast ? 'done' : 'planned', done: isPast }],
      completion: isPast ? 1 : null,
    };
  });

  return {
    weekStart: start,
    coachMessage,
    days: days.map((d) => ({
      date: d.date,
      rest_reason: d.rest_reason,
      completion: d.completion ?? null,
      sessions: d.sessions.map((s, i) => parseSession(s, i, d.date)),
    })),
  };
}

// Mon..Sun. null = rest day.
export const DEMO_PLAN_WEEKS: WeeklyPlan[] = [
  buildWeek(
    0,
    'Solide Aufbauwoche. Der Fokus liegt auf der Schwelle am Mittwoch und einem ruhigen langen Lauf am Sonntag. Halte die lockeren Laeufe wirklich locker.',
    [
      easyRun('Lockerer Dauerlauf', 45, '5:45/km', 45),
      strength(),
      intervalRun(),
      null,
      easyRun('Lockerer Dauerlauf', 50, '5:40/km', 50),
      null,
      longRun(18),
    ],
  ),
  buildWeek(
    1,
    'Leichte Steigerung im Umfang. Wir verlaengern den langen Lauf auf 20 km und halten die Intensitaet bei einer harten Einheit, damit die Achillessehne mitkommt.',
    [
      easyRun('Lockerer Dauerlauf', 50, '5:45/km', 50),
      strength(),
      intervalRun(),
      null,
      easyRun('Lockerer Dauerlauf mit Steigerungen', 50, '5:40/km', 55),
      null,
      longRun(20),
    ],
  ),
];

export const DEMO_PLAN = {
  hasPlan: true,
  status: 'active',
  rationale:
    'Aufbaublock fuer deinen Halbmarathon in ~10 Wochen. Zwei harte Einheiten pro Woche (Schwelle + langer Lauf), der Rest locker, plus eine Krafteinheit fuer die Achillessehne. Umfang steigt kontrolliert um ~8% pro Woche.',
  weeks: DEMO_PLAN_WEEKS,
};
