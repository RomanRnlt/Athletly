import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

interface GradientHeaderProps {
  title?: string;
  subtitle?: string;
  rightContent?: ReactNode;
  children?: ReactNode;
}

export function GradientHeader({ title, subtitle, rightContent, children }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View>
      <LinearGradient
        colors={['#2563EB', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top }}
      >
        <View className="px-4 pt-2 pb-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              {title && (
                <Text className="text-white text-[26px] font-bold" style={{ letterSpacing: -0.3 }}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text className="text-white/80 text-[15px] mt-1">{subtitle}</Text>
              )}
            </View>
            {rightContent}
          </View>
          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

export default GradientHeader;
