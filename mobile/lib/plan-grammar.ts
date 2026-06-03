// SPDX-License-Identifier: MIT
/**
 * Boundary parsing for the universal session grammar (ADR 0001).
 *
 * The /plan endpoint returns jsonb passthrough, so this is untrusted data: we
 * coerce every field into the typed grammar with safe fallbacks (closed-vocab
 * tokens snap to a default, numbers coerce or become null). Also derives an
 * approximate session duration for week summaries (the grammar deliberately
 * has no session-level duration).
 */

import type {
  Group,
  GroupMode,
  PlannedSession,
  Prescription,
  PrescriptionKind,
  SessionIntent,
  Step,
  StepRole,
  Target,
  TargetKind,
} from '@athletly/shared';

const INTENTS: readonly SessionIntent[] = [
  'recovery',
  'aerobic_base',
  'tempo',
  'threshold',
  'vo2max',
  'strength',
  'skill',
  'competition',
];
const GROUP_MODES: readonly GroupMode[] = ['fixed', 'for_time', 'amrap', 'emom'];
const STEP_ROLES: readonly StepRole[] = ['warmup', 'work', 'recovery', 'rest', 'cooldown'];
const TARGET_KINDS: readonly TargetKind[] = ['time', 'distance', 'reps', 'open'];
const PRESCRIPTION_KINDS: readonly PrescriptionKind[] = [
  'pace',
  'hr',
  'power',
  'rpe',
  'load',
  'none',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asIntOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parseTarget(raw: Record<string, unknown>): Target {
  const kind = asEnum(raw.kind, TARGET_KINDS, 'open');
  const amount = kind === 'open' ? null : asNumberOrNull(raw.amount);
  return { kind, amount, unit: asString(raw.unit) };
}

function parsePrescription(raw: unknown): Prescription | null {
  if (!isRecord(raw)) return null;
  const kind = asEnum(raw.kind, PRESCRIPTION_KINDS, 'none');
  if (kind === 'none') return null;
  let rng: readonly [number, number] | null = null;
  if (
    Array.isArray(raw.rng) &&
    raw.rng.length === 2 &&
    typeof raw.rng[0] === 'number' &&
    typeof raw.rng[1] === 'number'
  ) {
    rng = [raw.rng[0], raw.rng[1]];
  }
  return { kind, value: typeof raw.value === 'string' ? raw.value : null, rng };
}

function parseStep(raw: Record<string, unknown>): Step {
  return {
    role: asEnum(raw.role, STEP_ROLES, 'work'),
    target: parseTarget(isRecord(raw.target) ? raw.target : {}),
    prescription: parsePrescription(raw.prescription),
    movement: asString(raw.movement),
    note: asString(raw.note),
  };
}

function parseGroup(raw: Record<string, unknown>): Group {
  return {
    mode: asEnum(raw.mode, GROUP_MODES, 'fixed'),
    label: asString(raw.label),
    rounds: asIntOrNull(raw.rounds),
    capSeconds: asIntOrNull(raw.cap_s),
    intervalSeconds: asIntOrNull(raw.interval_s),
    steps: Array.isArray(raw.steps) ? raw.steps.filter(isRecord).map(parseStep) : [],
  };
}

function estimateStepSeconds(step: Step): number {
  const { target } = step;
  if (target.kind === 'time' && typeof target.amount === 'number') return target.amount;
  // ~4s per rep including tempo; distance/open are not estimable without pace.
  if (target.kind === 'reps' && typeof target.amount === 'number') return target.amount * 4;
  return 0;
}

function estimateGroupSeconds(group: Group): number {
  if (
    (group.mode === 'amrap' || group.mode === 'emom' || group.mode === 'for_time') &&
    group.capSeconds &&
    group.capSeconds > 0
  ) {
    return group.capSeconds;
  }
  const perRound = group.steps.reduce((sum, step) => sum + estimateStepSeconds(step), 0);
  const rounds = group.mode === 'fixed' && group.rounds && group.rounds > 0 ? group.rounds : 1;
  return perRound * rounds;
}

export function estimateSessionMinutes(groups: readonly Group[]): number {
  const seconds = groups.reduce((sum, group) => sum + estimateGroupSeconds(group), 0);
  return Math.round(seconds / 60);
}

export function parseSession(raw: unknown, idx: number, date: string): PlannedSession {
  const record = isRecord(raw) ? raw : {};
  const groups = Array.isArray(record.groups)
    ? record.groups.filter(isRecord).map(parseGroup)
    : [];
  return {
    id: `${date}-${idx}`,
    sport: asString(record.sport, 'unknown'),
    intent: asEnum(record.intent, INTENTS, 'aerobic_base'),
    headline: asString(record.headline),
    load: asNumberOrNull(record.load),
    status: asString(record.status, 'planned'),
    groups,
    estimatedMinutes: estimateSessionMinutes(groups),
    done: record.done === true,
  };
}
