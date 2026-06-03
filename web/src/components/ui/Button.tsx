'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/ui/Button.tsx. Same variants, sizes, colors,
// and the same Tailwind class names; Pressable -> <button>, RN style objects
// -> React.CSSProperties.
import React from 'react';
import type { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'rounded-[14px]',
  secondary: 'bg-white rounded-[14px]',
  ghost: 'bg-transparent rounded-[14px]',
  destructive: 'rounded-[14px]',
  icon: 'rounded-xl items-center justify-center',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-4',
  md: 'h-11 px-5',
  lg: 'h-[52px] px-6',
};

const iconSizeMap: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 24 };
const textSizeMap: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-[52px] w-[52px]',
};

const ICON_COLORS: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: '#0F172A',
  ghost: '#2563EB',
  destructive: '#EF4444',
  icon: '#475569',
};

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: '#0F172A',
  ghost: '#2563EB',
  destructive: '#EF4444',
  icon: '#475569',
};

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: '#1E293B',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  secondary: { borderWidth: 1, borderStyle: 'solid', borderColor: '#E2E8F0' },
  ghost: {},
  destructive: { backgroundColor: '#FEE2E2' },
  icon: {
    backgroundColor: '#F5F6F8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#E2E8F0',
  },
};

function Spinner({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border-2 border-transparent animate-spin"
      style={{ borderTopColor: color, borderRightColor: color }}
      aria-hidden
    />
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  icon: Icon,
  iconPosition = 'left',
  onPress,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isIcon = variant === 'icon';
  const iconSize = iconSizeMap[size];
  const iconColor = ICON_COLORS[variant];

  const className = [
    'inline-flex flex-row items-center justify-center select-none',
    isIcon ? iconOnlySizeClasses[size] : sizeClasses[size],
    variantClasses[variant],
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ');

  const textClass =
    variant === 'primary' || variant === 'destructive' ? 'font-semibold' : 'font-medium';

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled || loading}
      className={className}
      style={VARIANT_STYLES[variant]}
      aria-label={label}
    >
      {loading ? (
        <Spinner color={iconColor} />
      ) : (
        <span className="inline-flex flex-row items-center gap-2">
          {Icon && iconPosition === 'left' && (
            <Icon size={iconSize} color={iconColor} strokeWidth={2} />
          )}
          {label && !isIcon && (
            <span className={`${textClass} ${textSizeMap[size]}`} style={{ color: TEXT_COLORS[variant] }}>
              {label}
            </span>
          )}
          {Icon && iconPosition === 'right' && (
            <Icon size={iconSize} color={iconColor} strokeWidth={2} />
          )}
        </span>
      )}
    </button>
  );
}

export default Button;
