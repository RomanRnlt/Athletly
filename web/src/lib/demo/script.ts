// SPDX-License-Identifier: MIT
// Scripted chat for DEMO_MODE.
//
// A small interpreter that replays a hand-authored coaching conversation with
// realistic cadence, emitting the SAME events the real SSE stream emits
// (token, tool_call, tool_result, status, done). This lets the agent's
// "show work" UI animate exactly as if a live backend were streaming, without
// ever touching an LLM, a network, or an API key.

import type { ToolCallEvent, ToolResultEvent, StatusEvent } from '../api';
import type { TranslateFn } from '@/i18n';

interface ReplayHandlers {
  onToken: (delta: string) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onToolResult?: (event: ToolResultEvent) => void;
  onStatus?: (event: StatusEvent) => void;
  onDone: (id: string, model: string) => void;
  onError: (message: string) => void;
}

// --- script grammar --------------------------------------------------------

type ScriptStep =
  | { kind: 'status'; label: string; depth: number; agent: string }
  | { kind: 'tool_call'; name: string; args: Record<string, unknown>; depth: number; agent: string }
  | { kind: 'tool_result'; name: string; preview: string; depth: number; agent: string }
  | { kind: 'text'; text: string };

interface ScriptedTurn {
  steps: ScriptStep[];
}

const status = (label: string, depth = 0, agent = 'coach'): ScriptStep => ({
  kind: 'status',
  label,
  depth,
  agent,
});
const toolCall = (
  name: string,
  args: Record<string, unknown>,
  depth = 0,
  agent = 'coach',
): ScriptStep => ({ kind: 'tool_call', name, args, depth, agent });
const toolResult = (name: string, preview: string, depth = 0, agent = 'coach'): ScriptStep => ({
  kind: 'tool_result',
  name,
  preview,
  depth,
  agent,
});
const text = (t: string): ScriptStep => ({ kind: 'text', text: t });

// --- the conversation ------------------------------------------------------
//
// Three turns that progressively showcase the product:
//   1. Welcome / framing (pure text).
//   2. Data-driven readiness check (tool calls + results).
//   3. Plan generation via a specialist sub-agent (nested depth, evaluator,
//      submit_plan) so the nested "show work" footer animates.

function welcomeTurn(t: TranslateFn): ScriptedTurn {
  return { steps: [text(t('demoContent.chat.welcome'))] };
}

function readinessTurn(t: TranslateFn): ScriptedTurn {
  return {
    steps: [
      status(t('demoContent.chat.readiness.status')),
      toolCall('get_daily_metrics', { days: 3 }),
      toolResult('get_daily_metrics', t('demoContent.chat.readiness.metricsResult')),
      toolCall('get_weekly_load', { weeks: 2 }),
      toolResult('get_weekly_load', t('demoContent.chat.readiness.loadResult')),
      text(t('demoContent.chat.readiness.text1')),
      text(t('demoContent.chat.readiness.text2')),
    ],
  };
}

function planTurn(t: TranslateFn): ScriptedTurn {
  return {
    steps: [
      status(t('demoContent.chat.plan.statusThinking')),
      toolCall('read_athlete_profile', {}),
      toolResult('read_athlete_profile', t('demoContent.chat.plan.profileResult')),
      status(t('demoContent.chat.plan.statusStartSpecialist'), 0, 'coach'),
      toolCall('run_specialist', { agent: 'plan', task: t('demoContent.chat.plan.taskLabel') }, 0, 'coach'),
      status(t('demoContent.chat.plan.statusPlanWorking'), 1, 'plan'),
      toolCall('search_activities', { sport: 'running', limit: 10 }, 1, 'plan'),
      toolResult('search_activities', t('demoContent.chat.plan.searchResult'), 1, 'plan'),
      toolCall('get_weekly_load', { weeks: 4 }, 1, 'plan'),
      toolResult('get_weekly_load', t('demoContent.chat.plan.loadResult'), 1, 'plan'),
      status(t('demoContent.chat.plan.statusEvaluate'), 1, 'plan'),
      toolCall('evaluate_plan', { focus: 'injury_risk' }, 2, 'evaluator'),
      toolResult('evaluate_plan', t('demoContent.chat.plan.evalResult'), 2, 'evaluator'),
      toolCall('submit_plan', { weeks: 2 }, 1, 'plan'),
      toolResult('submit_plan', t('demoContent.chat.plan.submitResult'), 1, 'plan'),
      toolResult('run_specialist', t('demoContent.chat.plan.specialistDone'), 0, 'coach'),
      text(t('demoContent.chat.plan.text1')),
      text(t('demoContent.chat.plan.text2')),
      text(t('demoContent.chat.plan.text3')),
    ],
  };
}

// First turn shown via triggerWelcome; subsequent user messages cycle through
// the remaining scripted turns, then loop back to the readiness turn.
let turnCursor = 0;

function nextTurn(t: TranslateFn): ScriptedTurn {
  const builders = [readinessTurn, planTurn];
  const turn = builders[turnCursor % builders.length](t);
  turnCursor += 1;
  return turn;
}

// --- replay engine ---------------------------------------------------------

function tokenize(s: string): string[] {
  // Split into word-ish chunks so token deltas look like a real LLM stream.
  return s.match(/\S+\s*|\s+/g) ?? [s];
}

function randDelay(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface StreamHandle {
  close: () => void;
}

function playTurn(turn: ScriptedTurn, handlers: ReplayHandlers): StreamHandle {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const schedule = (fn: () => void, delay: number): Promise<void> =>
    new Promise((resolve) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
        resolve();
      }, delay);
      timers.push(id);
    });

  (async () => {
    for (const step of turn.steps) {
      if (cancelled) return;
      if (step.kind === 'status') {
        await schedule(
          () => handlers.onStatus?.({ label: step.label, depth: step.depth, agent: step.agent }),
          randDelay(280, 520),
        );
      } else if (step.kind === 'tool_call') {
        await schedule(
          () =>
            handlers.onToolCall?.({
              name: step.name,
              args: step.args,
              depth: step.depth,
              agent: step.agent,
            }),
          randDelay(220, 420),
        );
      } else if (step.kind === 'tool_result') {
        await schedule(
          () =>
            handlers.onToolResult?.({
              name: step.name,
              preview: step.preview,
              depth: step.depth,
              agent: step.agent,
            }),
          randDelay(360, 720),
        );
      } else {
        // Stream text token-by-token at ~20-40ms cadence.
        for (const chunk of tokenize(step.text)) {
          if (cancelled) return;
          await schedule(() => handlers.onToken(chunk), randDelay(20, 40));
        }
      }
    }
    if (cancelled) return;
    await schedule(() => handlers.onDone(`demo-${Date.now()}`, 'demo-coach'), randDelay(120, 240));
  })();

  return {
    close: () => {
      cancelled = true;
      for (const id of timers) clearTimeout(id);
    },
  };
}

/** Replay the proactive opening (welcome) turn. */
export function replayWelcome(t: TranslateFn, handlers: ReplayHandlers): StreamHandle {
  turnCursor = 0;
  return playTurn(welcomeTurn(t), handlers);
}

/** Replay the next scripted assistant turn in response to a user message. */
export function replayScriptedTurn(t: TranslateFn, handlers: ReplayHandlers): StreamHandle {
  return playTurn(nextTurn(t), handlers);
}
