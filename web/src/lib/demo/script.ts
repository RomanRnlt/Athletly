// Scripted chat for DEMO_MODE.
//
// A small interpreter that replays a hand-authored coaching conversation with
// realistic cadence, emitting the SAME events the real SSE stream emits
// (token, tool_call, tool_result, status, done). This lets the agent's
// "show work" UI animate exactly as if a live backend were streaming, without
// ever touching an LLM, a network, or an API key.

import type { ToolCallEvent, ToolResultEvent, StatusEvent } from '../api';

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

const WELCOME_TURN: ScriptedTurn = {
  steps: [
    text(
      'Hey, ich bin Ohm, dein Coach. Schoen dass du da bist. Ich sehe deine Garmin-Daten und dein Profil sind verbunden: Halbmarathon-Ziel in rund 10 Wochen, aktuell ~45 km die Woche. Frag mich was zu deinem Training, deiner Erholung oder deinem Plan. Zum Beispiel: "Wie sieht meine Woche aus?" oder "Bin ich heute bereit fuer ein hartes Intervalltraining?"',
    ),
  ],
};

const READINESS_TURN: ScriptedTurn = {
  steps: [
    status('Schaut sich deine Daten an'),
    toolCall('get_daily_metrics', { days: 3 }),
    toolResult('get_daily_metrics', 'HRV 68ms, RHR 48, Schlaf 82, Recovery 78'),
    toolCall('get_weekly_load', { weeks: 2 }),
    toolResult('get_weekly_load', 'Diese Woche 42 km, letzte Woche 39 km (+8%)'),
    text(
      'Du bist heute gut erholt. Deine HRV liegt bei 68 ms (im oberen Bereich deiner letzten Wochen), die Ruhe-HF bei 48 und dein Recovery-Score bei 78. Der Schlaf war mit 82 solide. ',
    ),
    text(
      'Dein Wochenvolumen ist mit +8% gegenueber letzter Woche kontrolliert gestiegen. Kurz: gruenes Licht fuer eine harte Einheit. Wenn du heute die Schwellen-Intervalle machst, halte die Pausen wirklich locker (<140 bpm), damit die Achillessehne nicht ueberreizt wird.',
    ),
  ],
};

const PLAN_TURN: ScriptedTurn = {
  steps: [
    status('Denkt nach'),
    toolCall('read_athlete_profile', {}),
    toolResult('read_athlete_profile', 'Ziel: HM 1:35, 4x/Woche, Achillessehne empfindlich'),
    status('Startet den Plan-Spezialisten', 0, 'coach'),
    toolCall('run_specialist', { agent: 'plan', task: '2-Wochen-Block HM-Aufbau' }, 0, 'coach'),
    status('plan-Agent arbeitet', 1, 'plan'),
    toolCall('search_activities', { sport: 'running', limit: 10 }, 1, 'plan'),
    toolResult('search_activities', '6 Laeufe, letzter 9.8 km @ 5:31/km', 1, 'plan'),
    toolCall('get_weekly_load', { weeks: 4 }, 1, 'plan'),
    toolResult('get_weekly_load', 'Schnitt 41 km/Woche, stabil', 1, 'plan'),
    status('Laesst den Plan bewerten', 1, 'plan'),
    toolCall('evaluate_plan', { focus: 'injury_risk' }, 2, 'evaluator'),
    toolResult('evaluate_plan', 'OK: Umfangsteigerung 8%, 1 harte Einheit/Woche, Score 0.86', 2, 'evaluator'),
    toolCall('submit_plan', { weeks: 2 }, 1, 'plan'),
    toolResult('submit_plan', 'Plan gespeichert (2 Wochen, 10 Einheiten)', 1, 'plan'),
    toolResult('run_specialist', 'Plan-Spezialist fertig', 0, 'coach'),
    text(
      'Fertig. Ich habe dir einen 2-Wochen-Block gebaut, den du jetzt im Plan-Tab siehst. ',
    ),
    text(
      'Der Aufbau: zwei Schluesseleinheiten pro Woche (Schwellen-Intervalle am Mittwoch, langer Lauf am Sonntag), dazu zwei lockere Dauerlaeufe und eine Krafteinheit fuer die Achillessehne. ',
    ),
    text(
      'Der Umfang steigt von 18 auf 20 km im langen Lauf und insgesamt um rund 8% pro Woche, also bewusst konservativ wegen der Sehne. Schau ihn dir an und sag mir, wenn du etwas verschieben willst.',
    ),
  ],
};

// First turn shown via triggerWelcome; subsequent user messages cycle through
// the remaining scripted turns, then loop back to the readiness turn.
const SCRIPTED_TURNS: ScriptedTurn[] = [READINESS_TURN, PLAN_TURN];

let turnCursor = 0;

function nextTurn(): ScriptedTurn {
  const turn = SCRIPTED_TURNS[turnCursor % SCRIPTED_TURNS.length];
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
export function replayWelcome(handlers: ReplayHandlers): StreamHandle {
  turnCursor = 0;
  return playTurn(WELCOME_TURN, handlers);
}

/** Replay the next scripted assistant turn in response to a user message. */
export function replayScriptedTurn(handlers: ReplayHandlers): StreamHandle {
  return playTurn(nextTurn(), handlers);
}
