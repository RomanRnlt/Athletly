'use client';

// Web port of mobile/components/chat/ShowWorkFooter.tsx.
import React, { useCallback, useState } from 'react';
import { ChevronDown, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Colors } from '@/lib/colors';
import type { ToolStep } from '@/types/chat';

const INDENT_PER_DEPTH = 14;

function FooterStepRow({ step }: { step: ToolStep }) {
  if (step.kind === 'status') {
    return (
      <div className="flex flex-row items-center gap-2 py-px" style={{ paddingLeft: step.depth * INDENT_PER_DEPTH }}>
        <span className="w-4 h-4 flex items-center justify-center">
          <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: Colors.textMuted }} />
        </span>
        <span className="text-[13px] flex-1 font-semibold" style={{ color: Colors.textSecondary }}>
          {step.displayLabel}
        </span>
      </div>
    );
  }
  const isError = step.status === 'error';
  const Icon = isError ? AlertCircle : Check;
  return (
    <div className="flex flex-row items-center gap-2 py-px" style={{ paddingLeft: step.depth * INDENT_PER_DEPTH }}>
      <span className="w-4 h-4 flex items-center justify-center">
        <Icon size={12} color={isError ? Colors.error : Colors.success} strokeWidth={2.5} />
      </span>
      <span className="text-[13px] flex-1" style={{ color: Colors.textSecondary }}>
        {step.displayLabel}
      </span>
    </div>
  );
}

export function ShowWorkFooter({ steps }: { steps: readonly ToolStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((p) => !p), []);

  if (steps.length === 0) return null;

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="mt-1 mb-1 px-0.5 flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        className="flex flex-row items-center gap-1 py-1"
        aria-label={expanded ? 'Werkzeugliste einklappen' : 'Werkzeugliste ausklappen'}
      >
        <ChevronIcon size={12} color={Colors.textMuted} strokeWidth={2} />
        <span className="text-xs font-medium" style={{ color: Colors.textMuted }}>
          Werkzeuge verwendet ({steps.length})
        </span>
      </button>
      {expanded ? steps.map((step) => <FooterStepRow key={step.id} step={step} />) : null}
    </div>
  );
}

export default ShowWorkFooter;
