'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/ui/Input.tsx. TextInput -> <input>, with the
// same label/leftIcon/password-toggle layout and focus border behavior.
import React, { useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useT } from '@/i18n';

interface InputProps {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  isPassword?: boolean;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: string;
  autoCapitalize?: string;
  autoCorrect?: boolean;
  onSubmit?: () => void;
}

export function Input({
  label,
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  isPassword = false,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  onSubmit,
}: InputProps) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error ? '#EF4444' : focused ? '#2563EB' : '#E2E8F0';

  const inputType = isPassword && !showPassword
    ? 'password'
    : keyboardType === 'email-address'
      ? 'email'
      : keyboardType === 'number-pad'
        ? 'text'
        : 'text';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm mb-1.5 ml-1" style={{ color: '#475569' }}>
          {label}
        </label>
      )}
      <div
        className="flex flex-row items-center bg-white rounded-[14px] h-12 px-4"
        style={{ borderWidth: 1, borderStyle: 'solid', borderColor }}
      >
        {LeftIcon && (
          <span className="mr-2 flex items-center">
            <LeftIcon size={20} color="#94A3B8" strokeWidth={2} />
          </span>
        )}
        <input
          className="flex-1 text-base bg-transparent outline-none w-full"
          style={{ color: '#0F172A' }}
          type={inputType}
          inputMode={keyboardType === 'number-pad' ? 'numeric' : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChangeText?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) onSubmit();
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="ml-2 flex items-center"
            aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
          >
            {showPassword ? (
              <EyeOff size={20} color="#94A3B8" strokeWidth={2} />
            ) : (
              <Eye size={20} color="#94A3B8" strokeWidth={2} />
            )}
          </button>
        )}
        {RightIcon && !isPassword && (
          <span className="ml-2 flex items-center">
            <RightIcon size={20} color="#94A3B8" strokeWidth={2} />
          </span>
        )}
      </div>
      {error && <p className="text-error text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
}

export default Input;
