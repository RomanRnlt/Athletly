/**
 * Universal session grammar (ADR 0001) on the client.
 *
 * ONE shape renders every sport: a session has a Session Core
 * (sport/intent/headline/load/status) plus depth-1 groups, each holding steps.
 * All real numbers live in step targets/prescriptions. The renderer branches on
 * grammar structure (mode/role/target/prescription), NEVER on sport.
 */

export type SessionIntent =
  | 'recovery'
  | 'aerobic_base'
  | 'tempo'
  | 'threshold'
  | 'vo2max'
  | 'strength'
  | 'skill'
  | 'competition';

export type GroupMode = 'fixed' | 'for_time' | 'amrap' | 'emom';
export type StepRole = 'warmup' | 'work' | 'recovery' | 'rest' | 'cooldown';
export type TargetKind = 'time' | 'distance' | 'reps' | 'open';
export type PrescriptionKind = 'pace' | 'hr' | 'power' | 'rpe' | 'load' | 'none';

export interface Target {
  readonly kind: TargetKind;
  /** Canonical units: time=seconds, distance=meters, reps=count. null for 'open'. */
  readonly amount: number | null;
  /** Display hint only (e.g. 'km','m','reps',''). */
  readonly unit: string;
}

export interface Prescription {
  readonly kind: PrescriptionKind;
  /** Absolute resolved value, e.g. '3:58/km','155bpm','250W','100kg'. */
  readonly value: string | null;
  /** Optional [low, high] numeric range instead of a point value. */
  readonly rng: readonly [number, number] | null;
}

export interface Step {
  readonly role: StepRole;
  readonly target: Target;
  readonly prescription: Prescription | null;
  /** Free-text exercise / focus, or '' for implicit run/swim. */
  readonly movement: string;
  readonly note: string;
}

export interface Group {
  readonly mode: GroupMode;
  readonly label: string;
  readonly rounds: number | null;
  readonly capSeconds: number | null;
  readonly intervalSeconds: number | null;
  readonly steps: readonly Step[];
}

export interface PlannedSession {
  readonly id: string;
  readonly sport: string;
  readonly intent: SessionIntent;
  readonly headline: string;
  readonly load: number | null;
  readonly status: string;
  readonly groups: readonly Group[];
  /** Derived on the client for week summaries + strip. Approximate. */
  readonly estimatedMinutes: number;
  /** True when a matching real activity was found on the session's date. */
  readonly done: boolean;
}

export interface DayPlan {
  readonly date: string;
  readonly sessions: readonly PlannedSession[];
  readonly rest_reason?: string;
  /** Plan-vs-actual completion 0..1 (server-computed). null for rest days. */
  readonly completion: number | null;
}

export interface WeeklyPlan {
  readonly weekStart: string;
  readonly days: readonly DayPlan[];
  readonly coachMessage?: string;
}
