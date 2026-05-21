/**
 * ToolGroup - live activity checklist shown while the agent works.
 *
 * Renders one row per ToolStep, indented by `depth` so sub-agent work nests
 * under the specialist that spawned it (Claude-Code style). Tool rows show a
 * spinner/check/alert; status rows are section headers (e.g. "Plan-Agent
 * arbeitet"). Branches only on step shape, never on a specific tool.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Check, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/lib/colors';
import type { ToolStep } from '@/types/chat';

const INDENT_PER_DEPTH = 14;

function StepIndicator({ step }: { readonly step: ToolStep }) {
  if (step.kind === 'status') {
    return (
      <View style={styles.indicator}>
        <View style={styles.headerDot} />
      </View>
    );
  }
  if (step.status === 'running') {
    return (
      <View style={styles.indicator}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }
  if (step.status === 'error') {
    return (
      <View style={styles.indicator}>
        <AlertCircle size={13} color={Colors.error} strokeWidth={2.5} />
      </View>
    );
  }
  return (
    <View style={styles.indicator}>
      <Check size={13} color={Colors.success} strokeWidth={3} />
    </View>
  );
}

function labelColor(step: ToolStep): string {
  if (step.kind === 'status') return Colors.textSecondary;
  if (step.status === 'error') return Colors.error;
  if (step.status === 'running') return Colors.textPrimary;
  return Colors.textSecondary;
}

function StepRow({ step }: { readonly step: ToolStep }) {
  return (
    <View style={[styles.row, { paddingLeft: step.depth * INDENT_PER_DEPTH }]}>
      <StepIndicator step={step} />
      <Text
        style={[
          styles.label,
          { color: labelColor(step), fontWeight: step.kind === 'status' ? '600' : '400' },
        ]}
        numberOfLines={2}
      >
        {step.displayLabel}
      </Text>
    </View>
  );
}

export function ToolGroup({ steps }: { readonly steps: readonly ToolStep[] }) {
  if (steps.length === 0) return null;
  return (
    <View style={styles.card}>
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 10,
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
    paddingVertical: 1,
  },
  indicator: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  label: {
    fontSize: 13,
    flex: 1,
    flexShrink: 1,
  },
});

export default ToolGroup;
