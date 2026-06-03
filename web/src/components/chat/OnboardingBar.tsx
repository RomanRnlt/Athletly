'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/components/chat/OnboardingBar.tsx.
import React from 'react';
import { Colors } from '@athletly/shared';
import { useT } from '@/i18n';

const ONBOARDING_TARGET_SECTIONS = 5;

interface OnboardingBarProps {
  filledSections: number;
}

export function OnboardingBar({ filledSections }: OnboardingBarProps) {
  const t = useT();
  const clamped = Math.min(filledSections, ONBOARDING_TARGET_SECTIONS);
  const percent = Math.round((clamped / ONBOARDING_TARGET_SECTIONS) * 100);

  return (
    <div
      className="px-4 py-2 bg-primary-ultra-light"
      style={{ borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: Colors.primaryLight }}
    >
      <div className="flex flex-row items-center justify-between mb-1.5">
        <span className="text-text-secondary text-xs font-medium">{t('onboarding.title')}</span>
        <span className="text-primary text-xs font-semibold">
          {clamped} / {ONBOARDING_TARGET_SECTIONS}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: Colors.primaryLight }}>
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: Colors.primary }} />
      </div>
    </div>
  );
}

export default OnboardingBar;
