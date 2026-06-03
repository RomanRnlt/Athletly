// SPDX-License-Identifier: MIT
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  HeartPulse,
  MessageSquare,
  Shield,
  Target,
  Trophy,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Colors } from '@athletly/shared';
import { useAthleteProfile, type ProfileSection } from '@/lib/use-profile';

interface SectionMeta {
  icon: LucideIcon;
  hint: string;
}

const SECTION_META: Record<string, SectionMeta> = {
  'Warum ich trainiere': {
    icon: Target,
    hint: 'Motivation, Ziele, Identitaet',
  },
  'Sportarten & Rollen': {
    icon: Trophy,
    hint: 'Disziplinen, Wettkaempfe, Rollen',
  },
  'Nicht verhandelbar (Leben & Kontext)': {
    icon: Shield,
    hint: 'Familie, Job, Schlaf, harte Constraints',
  },
  'Wie ich auf Belastung reagiere': {
    icon: HeartPulse,
    hint: 'Erholungsmuster, Verletzungen, Sensibilitaet',
  },
  'Geschichte & Erfahrung': {
    icon: Clock,
    hint: 'Trainingsjahre, Bestzeiten, Erfolge',
  },
  'Coaching-Stil & Praeferenzen': {
    icon: MessageSquare,
    hint: 'Tonalitaet, Sprache, Feedback-Stil',
  },
};

function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Zurueck"
    >
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2} />
    </Pressable>
  );
}

function SectionCard({ section }: { section: ProfileSection }) {
  const meta = SECTION_META[section.name];
  const Icon = meta?.icon;
  const hint = meta?.hint;

  return (
    <Card variant="standard" className="mb-3">
      <View className="flex-row items-start mb-2">
        {Icon && (
          <View
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${Colors.primary}15` }}
          >
            <Icon size={18} color={Colors.primary} strokeWidth={2} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-text-primary text-base font-semibold">
            {section.name}
          </Text>
          {hint && (
            <Text className="text-text-muted text-xs mt-0.5">{hint}</Text>
          )}
        </View>
      </View>

      {section.empty ? (
        <Text className="text-text-muted text-sm italic leading-5">
          Noch nichts erfasst. Erzaehl Ohm im Chat davon - er speichert wichtige Dinge automatisch hier ab.
        </Text>
      ) : (
        <Text className="text-text-secondary text-sm leading-6">
          {section.content}
        </Text>
      )}
    </Card>
  );
}

export default function AthleteProfileScreen() {
  const { sections, isEmpty, isLoading, error, refresh } = useAthleteProfile();

  return (
    <View className="flex-1 bg-background">
      <GradientHeader
        title="Wie Athletly dich sieht"
        subtitle="Was Ohm dauerhaft ueber dich weiss"
        leftContent={<BackButton />}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}

        {error && (
          <View className="mb-3 px-4 py-2.5 rounded-xl bg-error-light">
            <Text className="text-error text-xs">{error}</Text>
          </View>
        )}

        {!isLoading && isEmpty && (
          <View className="mb-4 px-4 py-3 rounded-xl bg-primary-light/30">
            <Text className="text-text-secondary text-sm leading-5">
              Ohm kennt dich noch nicht. Sobald du im Chat ueber dich erzaehlst,
              fuellen sich diese Sections automatisch.
            </Text>
          </View>
        )}

        {!isLoading &&
          sections.map((section) => (
            <SectionCard key={section.name} section={section} />
          ))}

        {!isLoading && !error && (
          <Pressable
            onPress={refresh}
            className="mt-2 py-3 items-center"
            accessibilityRole="button"
            accessibilityLabel="Aktualisieren"
          >
            <Text className="text-primary text-sm font-medium">Aktualisieren</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
