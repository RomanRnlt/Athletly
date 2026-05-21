/**
 * Display humanization for the session grammar. Pure, presentation-only:
 * turns canonical grammar (seconds/meters, closed tokens) into German UI text.
 * Branches on grammar structure (kind/mode/role), never on sport.
 */

import type {
  Group,
  Prescription,
  PrescriptionKind,
  SessionIntent,
  StepRole,
  Target,
} from '@/types/plan';

const INTENT_LABELS: Record<SessionIntent, string> = {
  recovery: 'Erholung',
  aerobic_base: 'Grundlage',
  tempo: 'Tempo',
  threshold: 'Schwelle',
  vo2max: 'VO2max',
  strength: 'Kraft',
  skill: 'Technik',
  competition: 'Wettkampf',
};

// Map intent to a coarse intensity tier so the colored Badge stays meaningful.
const INTENT_TIERS: Record<SessionIntent, 'easy' | 'moderate' | 'hard'> = {
  recovery: 'easy',
  aerobic_base: 'easy',
  tempo: 'moderate',
  skill: 'moderate',
  threshold: 'hard',
  vo2max: 'hard',
  strength: 'hard',
  competition: 'hard',
};

const ROLE_LABELS: Record<StepRole, string> = {
  warmup: 'Aufwärmen',
  work: 'Belastung',
  recovery: 'Erholung',
  rest: 'Pause',
  cooldown: 'Auslaufen',
};

export function getIntentLabel(intent: SessionIntent): string {
  return INTENT_LABELS[intent] ?? intent;
}

export function getIntentTier(intent: SessionIntent): 'easy' | 'moderate' | 'hard' {
  return INTENT_TIERS[intent] ?? 'moderate';
}

export function getRoleLabel(role: StepRole): string {
  return ROLE_LABELS[role] ?? role;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function minutesFromSeconds(seconds: number): number {
  return Math.round(seconds / 60);
}

function formatSeconds(total: number): string {
  if (total < 60) return `${total} s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`;
}

export function formatTarget(target: Target): string {
  switch (target.kind) {
    case 'time':
      return typeof target.amount === 'number' ? formatSeconds(target.amount) : '';
    case 'distance':
      if (typeof target.amount !== 'number') return '';
      return target.amount >= 1000
        ? `${trimNum(target.amount / 1000)} km`
        : `${trimNum(target.amount)} m`;
    case 'reps':
      return typeof target.amount === 'number' ? `${trimNum(target.amount)} Wdh` : '';
    case 'open':
    default:
      return 'offen';
  }
}

// Unit suffix appended to a numeric prescription range, by kind. pace and rpe
// are formatted specially; load/none have no plain suffix here.
const RANGE_UNIT: Partial<Record<PrescriptionKind, string>> = {
  hr: 'bpm',
  power: 'W',
  load: 'kg',
};

function paceFromSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPrescription(prescription: Prescription | null): string | null {
  if (!prescription || prescription.kind === 'none') return null;

  if (prescription.rng) {
    const [lo, hi] = prescription.rng;
    if (prescription.kind === 'pace') {
      // pace ranges are stored as seconds per km; show m:ss-m:ss/km.
      return `${paceFromSeconds(lo)}-${paceFromSeconds(hi)}/km`;
    }
    if (prescription.kind === 'rpe') {
      return `RPE ${trimNum(lo)}-${trimNum(hi)}`;
    }
    const base = `${trimNum(lo)}-${trimNum(hi)}`;
    const unit = RANGE_UNIT[prescription.kind];
    return unit ? `${base} ${unit}` : base;
  }

  if (!prescription.value) return null;
  if (prescription.kind === 'rpe' && !/rpe/i.test(prescription.value)) {
    return `RPE ${prescription.value}`;
  }
  return prescription.value;
}

/** Header text for a group, or null when the group carries no extra format
 * info (a plain single-round fixed block needs no header). */
export function formatGroupMode(group: Group): string | null {
  switch (group.mode) {
    case 'fixed':
      return group.rounds && group.rounds > 1 ? `${group.rounds}x` : null;
    case 'emom': {
      const parts = ['EMOM'];
      if (group.intervalSeconds) parts.push(`${group.intervalSeconds}s`);
      if (group.capSeconds) parts.push(`· ${minutesFromSeconds(group.capSeconds)} min`);
      return parts.join(' ');
    }
    case 'amrap':
      return group.capSeconds ? `AMRAP ${minutesFromSeconds(group.capSeconds)} min` : 'AMRAP';
    case 'for_time':
      return group.capSeconds
        ? `Auf Zeit (Cap ${minutesFromSeconds(group.capSeconds)} min)`
        : 'Auf Zeit';
    default:
      return null;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
