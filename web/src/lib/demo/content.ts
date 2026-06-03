// SPDX-License-Identifier: MIT
// Locale-aware demo content: the athlete profile and 2-week training plan that
// carry user-facing text. Built from the i18n catalog so an English session
// reads in English and a German one in German. Non-text seed data (activities,
// metrics, garmin status, usage) lives in seed.ts and stays locale-neutral.

import type { WeeklyPlan } from '@athletly/shared';
import type { TranslateFn } from '@/i18n';
import { parseSession } from '../plan-grammar';
import type { ProfileSection } from '../use-profile';

// --- date helpers (local calendar Y-M-D, see seed.ts for rationale) --------

function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekStart(offsetWeeks: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const mondayDelta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayDelta + offsetWeeks * 7);
  return localYMD(d);
}

// --- athlete profile -------------------------------------------------------
//
// Section names match the athleteProfile.section.*.title keys so the profile
// screen finds the matching icon + hint.

// Canonical German section names. They are the identity keys SECTION_META in
// the athlete-profile screen matches on (the real backend returns these too),
// while the screen displays the translated title via the meta titleKey.
const SECTION_WHY = 'Warum ich trainiere';
const SECTION_SPORTS = 'Sportarten & Rollen';
const SECTION_NON_NEGOTIABLE = 'Nicht verhandelbar (Leben & Kontext)';
const SECTION_RESPONSE = 'Wie ich auf Belastung reagiere';
const SECTION_COACHING = 'Coaching-Stil & Praeferenzen';

export function buildDemoProfile(t: TranslateFn) {
  const sections: ProfileSection[] = [
    { name: SECTION_WHY, content: t('demoContent.profile.why'), empty: false },
    { name: SECTION_SPORTS, content: t('demoContent.profile.sports'), empty: false },
    { name: SECTION_NON_NEGOTIABLE, content: t('demoContent.profile.nonNegotiable'), empty: false },
    { name: SECTION_RESPONSE, content: t('demoContent.profile.response'), empty: false },
    { name: SECTION_COACHING, content: t('demoContent.profile.coaching'), empty: false },
  ];
  return {
    sections,
    is_empty: false,
    onboarding_completed: true,
    filled_sections: sections.length,
  };
}

// --- training plan (2 weeks) ----------------------------------------------

interface RawSession {
  sport: string;
  intent: string;
  headline: string;
  load: number;
  status?: string;
  groups: unknown[];
}

function easyRun(t: TranslateFn, headline: string, minutes: number, pace: string, load: number): RawSession {
  return {
    sport: 'running',
    intent: 'aerobic_base',
    headline,
    load,
    groups: [
      {
        mode: 'fixed',
        label: t('demoContent.plan.labelContinuous'),
        rounds: 1,
        steps: [
          {
            role: 'work',
            target: { kind: 'time', amount: minutes * 60, unit: 'min' },
            prescription: { kind: 'pace', value: pace },
            movement: '',
            note: t('demoContent.plan.noteEasy'),
          },
        ],
      },
    ],
  };
}

function intervalRun(t: TranslateFn): RawSession {
  return {
    sport: 'running',
    intent: 'threshold',
    headline: t('demoContent.plan.intervals'),
    load: 78,
    groups: [
      {
        mode: 'fixed',
        label: t('demoContent.plan.labelWarmup'),
        rounds: 1,
        steps: [
          {
            role: 'warmup',
            target: { kind: 'time', amount: 720, unit: 'min' },
            prescription: { kind: 'pace', value: '5:50/km' },
            movement: '',
            note: t('demoContent.plan.noteWarmup'),
          },
        ],
      },
      {
        mode: 'fixed',
        label: t('demoContent.plan.labelThreshold'),
        rounds: 4,
        steps: [
          {
            role: 'work',
            target: { kind: 'distance', amount: 1500, unit: 'm' },
            prescription: { kind: 'pace', value: '4:25/km', rng: [262, 268] },
            movement: '',
            note: t('demoContent.plan.noteThreshold'),
          },
          {
            role: 'recovery',
            target: { kind: 'time', amount: 150, unit: 'min' },
            prescription: { kind: 'hr', value: '<140bpm' },
            movement: '',
            note: t('demoContent.plan.noteRecovery'),
          },
        ],
      },
      {
        mode: 'fixed',
        label: t('demoContent.plan.labelCooldown'),
        rounds: 1,
        steps: [
          {
            role: 'cooldown',
            target: { kind: 'time', amount: 600, unit: 'min' },
            prescription: { kind: 'pace', value: '6:00/km' },
            movement: '',
            note: t('demoContent.plan.noteCooldown'),
          },
        ],
      },
    ],
  };
}

function longRun(t: TranslateFn, km: number): RawSession {
  return {
    sport: 'running',
    intent: 'aerobic_base',
    headline: t('demoContent.plan.longRun', { km }),
    load: 95,
    groups: [
      {
        mode: 'fixed',
        label: t('demoContent.plan.labelLongRun'),
        rounds: 1,
        steps: [
          {
            role: 'work',
            target: { kind: 'distance', amount: km * 1000, unit: 'km' },
            prescription: { kind: 'pace', value: '5:35/km', rng: [325, 345] },
            movement: '',
            note: t('demoContent.plan.noteLongRun'),
          },
        ],
      },
    ],
  };
}

function strength(t: TranslateFn): RawSession {
  return {
    sport: 'strength_training',
    intent: 'strength',
    headline: t('demoContent.plan.strength'),
    load: 40,
    groups: [
      {
        mode: 'fixed',
        label: t('demoContent.plan.labelStrengthCircuit'),
        rounds: 3,
        steps: [
          {
            role: 'work',
            target: { kind: 'reps', amount: 12, unit: 'reps' },
            prescription: { kind: 'load', value: '40kg' },
            movement: t('demoContent.plan.moveSquat'),
            note: '',
          },
          {
            role: 'work',
            target: { kind: 'reps', amount: 10, unit: 'reps' },
            prescription: { kind: 'none', value: null },
            movement: t('demoContent.plan.moveLunge'),
            note: t('demoContent.plan.notePerSide'),
          },
          {
            role: 'work',
            target: { kind: 'time', amount: 45, unit: 'min' },
            prescription: { kind: 'none', value: null },
            movement: t('demoContent.plan.movePlank'),
            note: '',
          },
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

function buildWeek(
  t: TranslateFn,
  offsetWeeks: number,
  coachMessage: string,
  sessions: (RawSession | null)[],
): WeeklyPlan {
  const start = weekStart(offsetWeeks);
  const startDate = new Date(`${start}T00:00:00`);
  const days: RawDay[] = sessions.map((session, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const date = localYMD(d);
    const isPast = d.getTime() < Date.now() - 86_400_000;
    if (session === null) {
      return { date, sessions: [], rest_reason: t('demoContent.plan.restReason'), completion: null };
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

export function buildDemoPlan(t: TranslateFn) {
  const weeks: WeeklyPlan[] = [
    buildWeek(t, 0, t('demoContent.plan.coach1'), [
      easyRun(t, t('demoContent.plan.easyRun'), 45, '5:45/km', 45),
      strength(t),
      intervalRun(t),
      null,
      easyRun(t, t('demoContent.plan.easyRun'), 50, '5:40/km', 50),
      null,
      longRun(t, 18),
    ]),
    buildWeek(t, 1, t('demoContent.plan.coach2'), [
      easyRun(t, t('demoContent.plan.easyRun'), 50, '5:45/km', 50),
      strength(t),
      intervalRun(t),
      null,
      easyRun(t, t('demoContent.plan.easyRunStrides'), 50, '5:40/km', 55),
      null,
      longRun(t, 20),
    ]),
  ];

  return {
    hasPlan: true,
    status: 'active',
    rationale: t('demoContent.plan.rationale'),
    weeks,
  };
}
