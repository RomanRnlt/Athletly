// SPDX-License-Identifier: MIT
// Ported 1:1 from mobile/lib/plan-format.ts. Pure presentation helpers.
import type {
  Group,
  Prescription,
  PrescriptionKind,
  SessionIntent,
  StepRole,
  Target,
} from '@athletly/shared';
import type { TranslateFn } from '@/i18n';

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

const INTENTS = new Set<string>([
  'recovery',
  'aerobic_base',
  'tempo',
  'threshold',
  'vo2max',
  'strength',
  'skill',
  'competition',
]);

const ROLES = new Set<string>(['warmup', 'work', 'recovery', 'rest', 'cooldown']);

export function getIntentLabel(t: TranslateFn, intent: SessionIntent): string {
  return INTENTS.has(intent) ? t(`intent.${intent}` as Parameters<TranslateFn>[0]) : intent;
}

export function getIntentTier(intent: SessionIntent): 'easy' | 'moderate' | 'hard' {
  return INTENT_TIERS[intent] ?? 'moderate';
}

export function getRoleLabel(t: TranslateFn, role: StepRole): string {
  return ROLES.has(role) ? t(`role.${role}` as Parameters<TranslateFn>[0]) : role;
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

export function formatTarget(t: TranslateFn, target: Target): string {
  switch (target.kind) {
    case 'time':
      return typeof target.amount === 'number' ? formatSeconds(target.amount) : '';
    case 'distance':
      if (typeof target.amount !== 'number') return '';
      return target.amount >= 1000
        ? `${trimNum(target.amount / 1000)} km`
        : `${trimNum(target.amount)} m`;
    case 'reps':
      return typeof target.amount === 'number'
        ? t('target.reps', { amount: trimNum(target.amount) })
        : '';
    case 'open':
    default:
      return t('target.open');
  }
}

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

export function formatGroupMode(t: TranslateFn, group: Group): string | null {
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
        ? t('group.forTimeCap', { minutes: minutesFromSeconds(group.capSeconds) })
        : t('group.forTime');
    default:
      return null;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
