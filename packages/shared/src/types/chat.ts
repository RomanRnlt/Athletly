// SPDX-License-Identifier: MIT
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * One line in the live activity view / show-work footer. A `tool` step is a
 * concrete tool call (search_activities, ...); a `status` step is a header line
 * the agent emitted (e.g. "plan-Agent arbeitet"). `depth` drives indentation:
 * 0 = the coach (Ohm), 1 = a specialist (plan), 2 = a sub-specialist (evaluator).
 */
export type ToolStepStatus = 'running' | 'done' | 'error';

export interface ToolStep {
  readonly id: string;
  readonly toolName: string;
  readonly displayLabel: string;
  readonly status: ToolStepStatus;
  readonly depth: number;
  readonly agent: string;
  readonly kind: 'tool' | 'status';
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  /** Tool/sub-agent activity captured during this turn (assistant only). */
  toolSteps?: readonly ToolStep[];
}
