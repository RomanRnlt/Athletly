'use client';

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

interface SectionMeta {
  icon: LucideIcon;
  hint: string;
}

const SECTION_META: Record<string, SectionMeta> = {
  'Warum ich trainiere': { icon: Target, hint: 'Motivation, Ziele, Identitaet' },
  'Sportarten & Rollen': { icon: Trophy, hint: 'Disziplinen, Wettkaempfe, Rollen' },
  'Nicht verhandelbar (Leben & Kontext)': { icon: Shield, hint: 'Familie, Job, Schlaf, harte Constraints' },
  'Wie ich auf Belastung reagiere': { icon: HeartPulse, hint: 'Erholungsmuster, Verletzungen, Sensibilitaet' },
  'Geschichte & Erfahrung': { icon: Clock, hint: 'Trainingsjahre, Bestzeiten, Erfolge' },
  'Coaching-Stil & Praeferenzen': { icon: MessageSquare, hint: 'Tonalitaet, Sprache, Feedback-Stil' },
};

function BackButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} aria-label="Zurueck" className="flex items-center">
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </button>
  );
}

function SectionCard({ section }: { section: ProfileSection }) {
  const meta = SECTION_META[section.name];
  const Icon = meta?.icon;
  const hint = meta?.hint;

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
          <p className="text-text-primary text-base font-semibold">{section.name}</p>
          {hint && <p className="text-text-muted text-xs mt-0.5">{hint}</p>}
        </div>
      </div>

      {section.empty ? (
        <p className="text-text-muted text-sm italic leading-5">
          Noch nichts erfasst. Erzaehl Ohm im Chat davon - er speichert wichtige Dinge automatisch
          hier ab.
        </p>
      ) : (
        <p className="text-text-secondary text-sm leading-6 whitespace-pre-wrap">{section.content}</p>
      )}
    </Card>
  );
}

export default function AthleteProfileScreen() {
  const { sections, isEmpty, isLoading, error, refresh } = useAthleteProfile();

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen">
      <GradientHeader
        title="Wie Athletly dich sieht"
        subtitle="Was Ohm dauerhaft ueber dich weiss"
        leftContent={<BackButton />}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-8">
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
            <p className="text-text-secondary text-sm leading-5">
              Ohm kennt dich noch nicht. Sobald du im Chat ueber dich erzaehlst, fuellen sich diese
              Sections automatisch.
            </p>
          </div>
        )}

        {!isLoading && sections.map((section) => <SectionCard key={section.name} section={section} />)}

        {!isLoading && !error && (
          <button type="button" onClick={refresh} className="mt-2 py-3 w-full flex items-center justify-center" aria-label="Aktualisieren">
            <span className="text-primary text-sm font-medium">Aktualisieren</span>
          </button>
        )}
      </div>
    </div>
  );
}
