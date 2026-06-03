'use client';

// Web port of mobile/components/plan/SessionCard.tsx. Sport-agnostic grammar
// rendering, identical structure.
import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
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

function PrescriptionChip({ text }: { text: string }) {
  return (
    <span
      className="inline-block rounded-md px-1.5 py-0.5"
      style={{ backgroundColor: Colors.primaryUltraLight }}
    >
      <span className="text-xs font-medium" style={{ color: Colors.primary }}>
        {text}
      </span>
    </span>
  );
}

function StepLine({ step }: { step: Step }) {
  const roleLabel = getRoleLabel(step.role);
  const targetText = formatTarget(step.target);
  const prescription = formatPrescription(step.prescription);

  const head = step.movement || roleLabel;
  const subParts = [step.movement ? roleLabel : '', step.note].filter(Boolean);

  return (
    <div className="flex flex-row items-start gap-2 py-1">
      <div className="flex-1">
        <p className="text-sm" style={{ color: Colors.textPrimary }}>
          {head}
          {targetText ? `  ${targetText}` : ''}
        </p>
        {subParts.length > 0 ? (
          <p className="text-xs mt-0.5" style={{ color: Colors.textMuted }}>
            {subParts.join(' · ')}
          </p>
        ) : null}
      </div>
      {prescription ? <PrescriptionChip text={prescription} /> : null}
    </div>
  );
}

function GroupBlock({ group }: { group: Group }) {
  const header = formatGroupMode(group);
  const showHeader = Boolean(header) || Boolean(group.label);

  return (
    <div className="mb-2">
      {showHeader ? (
        <div className="flex flex-row items-center gap-2 mb-0.5">
          {header ? (
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: Colors.textSecondary }}>
              {header}
            </span>
          ) : null}
          {group.label ? (
            <span className="text-xs font-medium" style={{ color: Colors.textMuted }}>
              {group.label}
            </span>
          ) : null}
        </div>
      ) : null}
      {group.steps.map((step, idx) => (
        <StepLine key={`step-${idx}`} step={step} />
      ))}
    </div>
  );
}

export function SessionCard({ session }: { session: PlannedSession }) {
  const sportColor = getSportColor(session.sport);
  const sportLabel = getSportLabel(session.sport);
  const intentLabel = getIntentLabel(session.intent);
  const intentTier = getIntentTier(session.intent);
  const duration = formatDuration(session.estimatedMinutes);
  const hasGroups = session.groups.length > 0;

  return (
    <div
      className="bg-surface mb-3 rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div style={{ height: 3, backgroundColor: sportColor }} />

      <div className="p-4">
        <div className="flex flex-row items-center justify-between mt-1 mb-2">
          <Badge type="sport" sport={session.sport} label={sportLabel} />
          <div className="flex flex-row items-center gap-2">
            {session.done ? (
              <div className="flex flex-row items-center gap-1">
                <CheckCircle2 size={14} color={Colors.success} strokeWidth={2.5} />
                <span className="text-xs font-semibold" style={{ color: Colors.success }}>
                  Erledigt
                </span>
              </div>
            ) : null}
            <Badge type="intensity" intensity={intentTier} label={intentLabel} />
          </div>
        </div>

        {session.headline ? (
          <p className="text-sm font-medium mb-3 leading-5" style={{ color: Colors.textPrimary }}>
            {session.headline}
          </p>
        ) : null}

        {hasGroups ? (
          <div className="mb-1">
            {session.groups.map((group, idx) => (
              <GroupBlock key={`group-${idx}`} group={group} />
            ))}
          </div>
        ) : null}

        {duration ? (
          <div className="flex flex-row items-center gap-1.5 mt-1">
            <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
            <span className="text-sm" style={{ color: Colors.textSecondary }}>
              ca. {duration}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default SessionCard;
