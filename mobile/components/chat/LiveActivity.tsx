/**
 * LiveActivity - shows what the agent is doing RIGHT NOW (Claude-Code style),
 * not a checked-off history. Derived from the accumulated steps: the active
 * tool, or - when inside a sub-agent - the sub-agent + its current action,
 * one level nested. The full history lives in ShowWorkFooter after the turn.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/lib/colors';
import type { ToolStep } from '@/types/chat';

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
  // No tool in flight: the agent is generating. Keep the latest context.
  const last = steps[steps.length - 1];
  return { agent: last.agent, action: 'Arbeitet…' };
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
    <View style={styles.card}>
      {label ? (
        <>
          <View style={styles.row}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.agent}>{label}</Text>
            {elapsed ? <Text style={styles.elapsed}>· {elapsed}</Text> : null}
          </View>
          <View style={[styles.row, styles.indented]}>
            <View style={styles.dot} />
            <Text style={styles.action}>{current.action}</Text>
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.action}>{current.action}</Text>
          {elapsed ? <Text style={styles.elapsed}>· {elapsed}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indented: {
    paddingLeft: 6,
  },
  agent: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  action: {
    color: Colors.textSecondary,
    fontSize: 13,
    flexShrink: 1,
  },
  elapsed: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 5,
  },
});

export default LiveActivity;
