'use client';

// Web port of mobile/components/profile/SettingsRow.tsx.
import React, { type ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Colors } from '@/lib/colors';

interface SettingsRowProps {
  icon?: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  isDestructive?: boolean;
  isLast?: boolean;
  rightElement?: ReactNode;
}

export function SettingsRow({
  icon: Icon,
  label,
  value,
  onPress,
  isDestructive = false,
  isLast = false,
  rightElement,
}: SettingsRowProps) {
  const labelColor = isDestructive ? 'text-error' : 'text-text-primary';
  const iconColor = isDestructive ? Colors.error : Colors.textSecondary;
  const borderClass = isLast ? '' : 'border-b border-divider';

  const content = (
    <div className={`flex flex-row items-center py-3.5 px-4 ${borderClass}`}>
      {Icon && (
        <span className="w-8 flex items-center justify-center mr-3">
          <Icon size={20} color={iconColor} />
        </span>
      )}
      <span className={`flex-1 text-base ${labelColor}`}>{label}</span>
      {value && <span className="text-sm text-text-secondary mr-2">{value}</span>}
      {rightElement}
      {onPress && !rightElement && <ChevronRight size={18} color={Colors.textMuted} />}
    </div>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className="w-full text-left transition-opacity hover:opacity-80"
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return content;
}

export default SettingsRow;
