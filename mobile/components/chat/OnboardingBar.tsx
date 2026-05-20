import React from 'react';
import { Text, View } from 'react-native';
import { Colors } from '@/lib/colors';

const ONBOARDING_TARGET_SECTIONS = 5;

interface OnboardingBarProps {
  filledSections: number;
}

export function OnboardingBar({ filledSections }: OnboardingBarProps) {
  const clamped = Math.min(filledSections, ONBOARDING_TARGET_SECTIONS);
  const percent = Math.round((clamped / ONBOARDING_TARGET_SECTIONS) * 100);

  return (
    <View
      className="px-4 py-2 bg-primary-ultra-light"
      style={{ borderBottomWidth: 1, borderBottomColor: Colors.primaryLight }}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-text-secondary text-xs font-medium">
          Erstgespraech mit Ohm
        </Text>
        <Text className="text-primary text-xs font-semibold">
          {clamped} / {ONBOARDING_TARGET_SECTIONS}
        </Text>
      </View>
      <View
        className="h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: Colors.primaryLight }}
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: Colors.primary }}
        />
      </View>
    </View>
  );
}

export default OnboardingBar;
