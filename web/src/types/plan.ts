// Ported 1:1 from mobile/types/plan.ts (universal session grammar, ADR 0001).
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
  readonly amount: number | null;
  readonly unit: string;
}

export interface Prescription {
  readonly kind: PrescriptionKind;
  readonly value: string | null;
  readonly rng: readonly [number, number] | null;
}

export interface Step {
  readonly role: StepRole;
  readonly target: Target;
  readonly prescription: Prescription | null;
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
  readonly estimatedMinutes: number;
  readonly done: boolean;
}

export interface DayPlan {
  readonly date: string;
  readonly sessions: readonly PlannedSession[];
  readonly rest_reason?: string;
  readonly completion: number | null;
}

export interface WeeklyPlan {
  readonly weekStart: string;
  readonly days: readonly DayPlan[];
  readonly coachMessage?: string;
}
