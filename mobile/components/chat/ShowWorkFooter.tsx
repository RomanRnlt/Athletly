/**
 * ShowWorkFooter - collapsible "what the agent did" log under a finished
 * assistant message. Closed by default; tap to expand the full step list
 * (indented by depth, same nesting as the live ToolGroup).
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronRight, Check, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/lib/colors';
import type { ToolStep } from '@/types/chat';

const INDENT_PER_DEPTH = 14;

function FooterStepRow({ step }: { readonly step: ToolStep }) {
  if (step.kind === 'status') {
    return (
      <View style={[styles.stepRow, { paddingLeft: step.depth * INDENT_PER_DEPTH }]}>
        <View style={styles.indicator}>
          <View style={styles.headerDot} />
        </View>
        <Text style={[styles.label, styles.statusLabel]} numberOfLines={2}>
          {step.displayLabel}
        </Text>
      </View>
    );
  }
  const isError = step.status === 'error';
  const Icon = isError ? AlertCircle : Check;
  return (
    <View style={[styles.stepRow, { paddingLeft: step.depth * INDENT_PER_DEPTH }]}>
      <View style={styles.indicator}>
        <Icon size={12} color={isError ? Colors.error : Colors.success} strokeWidth={2.5} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {step.displayLabel}
      </Text>
    </View>
  );
}

export function ShowWorkFooter({ steps }: { readonly steps: readonly ToolStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((p) => !p), []);

  if (steps.length === 0) return null;

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        style={styles.trigger}
        android_ripple={{ color: 'rgba(37,99,235,0.08)' }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Werkzeugliste einklappen' : 'Werkzeugliste ausklappen'}
      >
        <ChevronIcon size={12} color={Colors.textMuted} strokeWidth={2} />
        <Text style={styles.triggerLabel}>Werkzeuge verwendet ({steps.length})</Text>
      </Pressable>
      {expanded ? steps.map((step) => <FooterStepRow key={step.id} step={step} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 2,
    gap: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  triggerLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  stepRow: {
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
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
    flexShrink: 1,
  },
  statusLabel: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

export default ShowWorkFooter;
