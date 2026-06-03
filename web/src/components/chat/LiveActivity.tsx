'use client';

// Web port of mobile/components/chat/LiveActivity.tsx. StyleSheet -> Tailwind +
// inline styles; same derive-current logic and elapsed timer.
import React, { useEffect, useState } from 'react';
import { Colors } from '@athletly/shared';
import type { ToolStep } from '@athletly/shared';

const AGENT_LABELS: Record<string, string> = {
  plan: 'Plan-Agent',
  'evaluate-plan': 'Evaluator',
};

function agentLabel(agent: string): string | null {
  if (!agent || agent === 'coach') return null;
  return AGENT_LABELS[agent] ?? agent;
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Current {
  readonly agent: string;
  readonly action: string;
}

function deriveCurrent(steps: readonly ToolStep[]): Current | null {
  if (steps.length === 0) return null;
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const s = steps[i];
    if (s.kind === 'tool' && s.status === 'running') {
      return { agent: s.agent, action: s.displayLabel };
    }
  }
  const last = steps[steps.length - 1];
  return { agent: last.agent, action: 'Arbeitet…' };
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border-2 border-transparent animate-spin"
      style={{ borderTopColor: Colors.primary, borderRightColor: Colors.primary }}
      aria-hidden
    />
  );
}

interface LiveActivityProps {
  readonly steps: readonly ToolStep[];
  readonly startedAt: Date | null;
}

export function LiveActivity({ steps, startedAt }: LiveActivityProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const current = deriveCurrent(steps);
  if (!current) return null;

  const elapsed = startedAt ? formatElapsed(now - startedAt.getTime()) : '';
  const label = agentLabel(current.agent);

  return (
    <div
      className="rounded-[14px] py-2 px-2.5 mb-2 flex flex-col gap-1"
      style={{ backgroundColor: Colors.surface, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {label ? (
        <>
          <div className="flex flex-row items-center gap-2">
            <Spinner />
            <span className="text-[13px] font-semibold" style={{ color: Colors.textPrimary }}>
              {label}
            </span>
            {elapsed ? (
              <span className="text-xs" style={{ color: Colors.textMuted }}>
                · {elapsed}
              </span>
            ) : null}
          </div>
          <div className="flex flex-row items-center gap-2 pl-1.5">
            <span
              className="w-[5px] h-[5px] rounded-full mx-[5px]"
              style={{ backgroundColor: Colors.textMuted }}
            />
            <span className="text-[13px]" style={{ color: Colors.textSecondary }}>
              {current.action}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <Spinner />
          <span className="text-[13px]" style={{ color: Colors.textSecondary }}>
            {current.action}
          </span>
          {elapsed ? (
            <span className="text-xs" style={{ color: Colors.textMuted }}>
              · {elapsed}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default LiveActivity;
