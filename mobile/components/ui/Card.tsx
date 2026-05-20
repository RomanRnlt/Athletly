import React from 'react';
import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';

type CardVariant = 'standard' | 'hero' | 'metric' | 'nested';

interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

const variantClasses: Record<CardVariant, string> = {
  standard: 'bg-surface rounded-[16px] p-4',
  hero: 'bg-surface rounded-[20px] p-5',
  metric: 'bg-surface rounded-[16px] p-4 items-center',
  nested: 'rounded-[14px] p-4',
};

const ELEVATION_1 = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
} as const;

const ELEVATION_2 = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
} as const;

const NESTED_STYLE = { backgroundColor: '#F5F6F8' } as const;

function getShadowStyle(variant: CardVariant) {
  switch (variant) {
    case 'hero':
      return ELEVATION_2;
    case 'standard':
    case 'metric':
      return ELEVATION_1;
    case 'nested':
      return undefined;
  }
}

export function Card({ variant = 'standard', children, onPress, className = '' }: CardProps) {
  const baseClass = `${variantClasses[variant]} ${className}`;
  const isNested = variant === 'nested';
  const shadowStyle = getShadowStyle(variant);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={baseClass}
        style={({ pressed }) => [
          isNested ? NESTED_STYLE : undefined,
          shadowStyle,
          { opacity: pressed ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClass} style={[isNested ? NESTED_STYLE : undefined, shadowStyle]}>
      {children}
    </View>
  );
}

export default Card;
