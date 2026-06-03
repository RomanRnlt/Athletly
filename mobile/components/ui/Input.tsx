// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { View, TextInput, Text, Pressable } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  isPassword = false,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error ? '#EF4444' : focused ? '#2563EB' : '#E2E8F0';

  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm mb-1.5 ml-1" style={{ color: '#475569' }}>
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center bg-white rounded-[14px] h-12 px-4"
        style={{ borderWidth: 1, borderColor }}
      >
        {LeftIcon && (
          <View className="mr-2">
            <LeftIcon size={20} color="#94A3B8" strokeWidth={2} />
          </View>
        )}
        <TextInput
          className="flex-1 text-base"
          style={{ color: '#0F172A' }}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...textInputProps}
        />
        {isPassword && (
          <Pressable onPress={() => setShowPassword((prev) => !prev)} className="ml-2">
            {showPassword ? (
              <EyeOff size={20} color="#94A3B8" strokeWidth={2} />
            ) : (
              <Eye size={20} color="#94A3B8" strokeWidth={2} />
            )}
          </Pressable>
        )}
        {RightIcon && !isPassword && (
          <View className="ml-2">
            <RightIcon size={20} color="#94A3B8" strokeWidth={2} />
          </View>
        )}
      </View>
      {error && <Text className="text-error text-xs mt-1 ml-1">{error}</Text>}
    </View>
  );
}

export default Input;
