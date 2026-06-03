// SPDX-License-Identifier: MIT
import React from 'react';
import { View, Text } from 'react-native';
import { getSportColor } from '@/lib/sport-colors';

type BadgeType = 'sport' | 'status' | 'intensity';
type StatusLevel = 'success' | 'warning' | 'error';

interface SportBadgeProps {
  type: 'sport';
  sport: string;
  label: string;
}

interface StatusBadgeProps {
  type: 'status';
  status: StatusLevel;
  label: string;
}

interface IntensityBadgeProps {
  type: 'intensity';
  intensity: string;
  label: string;
}

type BadgeProps = SportBadgeProps | StatusBadgeProps | IntensityBadgeProps;

const STATUS_COLORS: Record<StatusLevel, string> = {
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

const INTENSITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  easy: '#22C55E',
  moderate: '#2563EB',
  high: '#F59E0B',
  hard: '#EF4444',
};

const DEFAULT_INTENSITY_COLOR = '#94A3B8';

function getColorForBadge(props: BadgeProps): string {
  switch (props.type) {
    case 'sport':
      return getSportColor(props.sport);
    case 'status':
      return STATUS_COLORS[props.status];
    case 'intensity':
      return INTENSITY_COLORS[props.intensity.toLowerCase()] ?? DEFAULT_INTENSITY_COLOR;
  }
}

export function Badge(props: BadgeProps) {
  const color = getColorForBadge(props);

  return (
    <View className="rounded-full px-3 py-1 self-start" style={{ backgroundColor: `${color}15` }}>
      <Text className="text-xs font-semibold" style={{ color }}>
        {props.label}
      </Text>
    </View>
  );
}

export default Badge;
