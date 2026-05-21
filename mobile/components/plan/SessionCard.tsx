/**
 * SessionCard - renders a planned session in the universal grammar (ADR 0001).
 *
 * Sport-agnostic by construction: it branches on grammar structure
 * (group.mode, step.role, target.kind, prescription.kind), NEVER on sport. The
 * same component renders a run, a strength split, a swim set, or a functional
 * WOD. Presentation only; no coaching judgments here.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, CheckCircle2 } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/lib/colors';
import { getSportColor } from '@/lib/sport-colors';
import { getSportLabel } from '@/lib/sport-icons';
import {
  formatDuration,
  formatGroupMode,
  formatPrescription,
  formatTarget,
  getIntentLabel,
  getIntentTier,
  getRoleLabel,
} from '@/lib/plan-format';
import type { Group, PlannedSession, Step } from '@/types/plan';

interface SessionCardProps {
  session: PlannedSession;
}

function PrescriptionChip({ text }: { readonly text: string }) {
  return (
    <View style={styles.chip}>
      <Text className="text-xs font-medium" style={{ color: Colors.primary }}>
        {text}
      </Text>
    </View>
  );
}

function StepLine({ step }: { readonly step: Step }) {
  const roleLabel = getRoleLabel(step.role);
  const targetText = formatTarget(step.target);
  const prescription = formatPrescription(step.prescription);

  // With an explicit movement (e.g. "Squat") it leads and the role becomes a
  // sublabel; for implicit moves (run/swim) the role label leads.
  const head = step.movement || roleLabel;
  const subParts = [step.movement ? roleLabel : '', step.note].filter(Boolean);

  return (
    <View className="flex-row items-start gap-2 py-1">
      <View className="flex-1">
        <Text className="text-sm" style={{ color: Colors.textPrimary }}>
          {head}
          {targetText ? `  ${targetText}` : ''}
        </Text>
        {subParts.length > 0 ? (
          <Text className="text-xs mt-0.5" style={{ color: Colors.textMuted }}>
            {subParts.join(' · ')}
          </Text>
        ) : null}
      </View>
      {prescription ? <PrescriptionChip text={prescription} /> : null}
    </View>
  );
}

function GroupBlock({ group }: { readonly group: Group }) {
  const header = formatGroupMode(group);
  const showHeader = Boolean(header) || Boolean(group.label);

  return (
    <View className="mb-2">
      {showHeader ? (
        <View className="flex-row items-center gap-2 mb-0.5">
          {header ? (
            <Text
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: Colors.textSecondary }}
            >
              {header}
            </Text>
          ) : null}
          {group.label ? (
            <Text className="text-xs font-medium" style={{ color: Colors.textMuted }}>
              {group.label}
            </Text>
          ) : null}
        </View>
      ) : null}
      {group.steps.map((step, idx) => (
        <StepLine key={`step-${idx}`} step={step} />
      ))}
    </View>
  );
}

export function SessionCard({ session }: SessionCardProps) {
  const sportColor = getSportColor(session.sport);
  const sportLabel = getSportLabel(session.sport);
  const intentLabel = getIntentLabel(session.intent);
  const intentTier = getIntentTier(session.intent);
  const duration = formatDuration(session.estimatedMinutes);
  const hasGroups = session.groups.length > 0;

  return (
    <View style={styles.card} className="bg-surface mb-3">
      <View style={[styles.accentBar, { backgroundColor: sportColor }]} />

      <View className="p-4">
        <View className="flex-row items-center justify-between mt-1 mb-2">
          <Badge type="sport" sport={session.sport} label={sportLabel} />
          <View className="flex-row items-center gap-2">
            {session.done ? (
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={14} color={Colors.success} strokeWidth={2.5} />
                <Text className="text-xs font-semibold" style={{ color: Colors.success }}>
                  Erledigt
                </Text>
              </View>
            ) : null}
            <Badge type="intensity" intensity={intentTier} label={intentLabel} />
          </View>
        </View>

        {session.headline ? (
          <Text
            className="text-sm font-medium mb-3 leading-5"
            style={{ color: Colors.textPrimary }}
          >
            {session.headline}
          </Text>
        ) : null}

        {hasGroups ? (
          <View className="mb-1">
            {session.groups.map((group, idx) => (
              <GroupBlock key={`group-${idx}`} group={group} />
            ))}
          </View>
        ) : null}

        {duration ? (
          <View className="flex-row items-center gap-1.5 mt-1">
            <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text className="text-sm" style={{ color: Colors.textSecondary }}>
              ca. {duration}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    height: 3,
  },
  chip: {
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});

export default SessionCard;
