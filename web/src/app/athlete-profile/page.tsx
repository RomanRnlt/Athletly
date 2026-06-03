'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/athlete-profile.tsx.
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Clock,
  HeartPulse,
  MessageSquare,
  Shield,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Colors } from '@athletly/shared';
import { useAthleteProfile, type ProfileSection } from '@/lib/use-profile';
import { useT, type MessageKey, type TranslateFn } from '@/i18n';

interface SectionMeta {
  icon: LucideIcon;
  titleKey: MessageKey;
  hintKey: MessageKey;
}

// Section identity is the backend's canonical German section name (the real
// API returns these). Demo content reuses the same German titles via the
// athleteProfile.section.*.title keys, so the lookup works in both paths.
const SECTION_META: Record<string, SectionMeta> = {
  'Warum ich trainiere': {
    icon: Target,
    titleKey: 'athleteProfile.section.why.title',
    hintKey: 'athleteProfile.section.why.hint',
  },
  'Sportarten & Rollen': {
    icon: Trophy,
    titleKey: 'athleteProfile.section.sports.title',
    hintKey: 'athleteProfile.section.sports.hint',
  },
  'Nicht verhandelbar (Leben & Kontext)': {
    icon: Shield,
    titleKey: 'athleteProfile.section.nonNegotiable.title',
    hintKey: 'athleteProfile.section.nonNegotiable.hint',
  },
  'Wie ich auf Belastung reagiere': {
    icon: HeartPulse,
    titleKey: 'athleteProfile.section.response.title',
    hintKey: 'athleteProfile.section.response.hint',
  },
  'Geschichte & Erfahrung': {
    icon: Clock,
    titleKey: 'athleteProfile.section.history.title',
    hintKey: 'athleteProfile.section.history.hint',
  },
  'Coaching-Stil & Praeferenzen': {
    icon: MessageSquare,
    titleKey: 'athleteProfile.section.coaching.title',
    hintKey: 'athleteProfile.section.coaching.hint',
  },
};

function BackButton() {
  const router = useRouter();
  const t = useT();
  return (
    <button type="button" onClick={() => router.back()} aria-label={t('common.back')} className="flex items-center">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </button>
  );
}

function SectionCard({ section, t }: { section: ProfileSection; t: TranslateFn }) {
  const meta = SECTION_META[section.name];
  const Icon = meta?.icon;
  const title = meta ? t(meta.titleKey) : section.name;
  const hint = meta ? t(meta.hintKey) : undefined;

  return (
    <Card variant="standard" className="mb-3">
      <div className="flex flex-row items-start mb-2">
        {Icon && (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mr-3 shrink-0"
            style={{ backgroundColor: `${Colors.primary}15` }}
          >
            <Icon size={18} color={Colors.primary} strokeWidth={2} />
          </div>
        )}
        <div className="flex-1">
          <p className="text-text-primary text-base font-semibold">{title}</p>
          {hint && <p className="text-text-muted text-xs mt-0.5">{hint}</p>}
        </div>
      </div>

      {section.empty ? (
        <p className="text-text-muted text-sm italic leading-5">
          {t('athleteProfile.sectionEmpty')}
        </p>
      ) : (
        <p className="text-text-secondary text-sm leading-6 whitespace-pre-wrap">{section.content}</p>
      )}
    </Card>
  );
}

export default function AthleteProfileScreen() {
  const t = useT();
  const { sections, isEmpty, isLoading, error, refresh } = useAthleteProfile();

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-background">
      <GradientHeader
        title={t('athleteProfile.title')}
        subtitle={t('athleteProfile.subtitle')}
        leftContent={<BackButton />}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-8 md:px-10 md:pt-8 md:pb-12">
       <div className="mx-auto w-full md:max-w-5xl">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <span
              className="inline-block h-6 w-6 rounded-full border-4 border-transparent animate-spin"
              style={{ borderTopColor: Colors.primary, borderRightColor: Colors.primary }}
            />
          </div>
        )}

        {error && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-error-light">
            <p className="text-error text-xs">{error}</p>
          </div>
        )}

        {!isLoading && isEmpty && (
          <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: `${Colors.primaryLight}4D` }}>
            <p className="text-text-secondary text-sm leading-5">{t('athleteProfile.emptyBanner')}</p>
          </div>
        )}

        {!isLoading && (
          <div className="md:grid md:grid-cols-2 md:gap-x-6 md:items-start">
            {sections.map((section) => (
              <SectionCard key={section.name} section={section} t={t} />
            ))}
          </div>
        )}

        {!isLoading && !error && (
          <button type="button" onClick={refresh} className="mt-2 py-3 w-full flex items-center justify-center" aria-label={t('common.refresh')}>
            <span className="text-primary text-sm font-medium">{t('common.refresh')}</span>
          </button>
        )}
       </div>
      </div>
    </div>
  );
}
