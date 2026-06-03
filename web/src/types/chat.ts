// Ported 1:1 from mobile/types/chat.ts.
export type ChatRole = 'user' | 'assistant' | 'system';

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
