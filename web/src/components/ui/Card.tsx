'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/ui/Card.tsx. Same variants + shadow elevations,
// translated to CSS box-shadow. Pressable -> div with onClick when onPress set.
import React, { type ReactNode } from 'react';

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

const ELEVATION_1 = '0 1px 3px rgba(0,0,0,0.06)';
const ELEVATION_2 = '0 4px 12px rgba(0,0,0,0.08)';
const NESTED_STYLE: React.CSSProperties = { backgroundColor: '#F5F6F8' };

function getShadow(variant: CardVariant): string | undefined {
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
  const style: React.CSSProperties = {
    ...(isNested ? NESTED_STYLE : {}),
    boxShadow: getShadow(variant),
  };

  if (onPress) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onPress}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onPress();
        }}
        className={`${baseClass} cursor-pointer transition-opacity hover:opacity-90`}
        style={style}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={baseClass} style={style}>
      {children}
    </div>
  );
}

export default Card;
