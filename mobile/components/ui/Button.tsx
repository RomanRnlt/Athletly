// SPDX-License-Identifier: MIT
import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

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

const VARIANT_STYLES: Record<ButtonVariant, Record<string, unknown>> = {
  primary: {
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  secondary: { borderWidth: 1, borderColor: '#E2E8F0' },
  ghost: {},
  destructive: { backgroundColor: '#FEE2E2' },
  icon: { backgroundColor: '#F5F6F8', borderWidth: 1, borderColor: '#E2E8F0' },
};

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
    'flex-row items-center justify-center',
    isIcon ? iconOnlySizeClasses[size] : sizeClasses[size],
    variantClasses[variant],
    disabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const textClass = variant === 'primary' || variant === 'destructive'
    ? 'font-semibold'
    : 'font-medium';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={className}
      style={
        disabled
          ? [VARIANT_STYLES[variant], { opacity: 0.5 }]
          : VARIANT_STYLES[variant]
      }
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icon && iconPosition === 'left' && (
            <Icon size={iconSize} color={iconColor} strokeWidth={2} />
          )}
          {label && !isIcon && (
            <Text
              className={`${textClass} ${textSizeMap[size]}`}
              style={{ color: TEXT_COLORS[variant] }}
            >
              {label}
            </Text>
          )}
          {Icon && iconPosition === 'right' && (
            <Icon size={iconSize} color={iconColor} strokeWidth={2} />
          )}
        </View>
      )}
    </Pressable>
  );
}

export default Button;
