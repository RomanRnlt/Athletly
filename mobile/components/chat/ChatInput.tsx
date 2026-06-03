// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Send } from 'lucide-react-native';
import { Colors } from '@athletly/shared';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_INPUT_LINES = 5;
const LINE_HEIGHT = 20;
const MAX_INPUT_HEIGHT = MAX_INPUT_LINES * LINE_HEIGHT + 16;

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSend(trimmed);
    setText('');
  };

  const hasText = text.trim().length > 0;

  return (
    <View
      className="bg-white px-4 pt-2"
      style={{
        paddingBottom: Math.max(insets.bottom, 8),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row items-end gap-2">
        <Pressable
          disabled={disabled}
          className="h-9 w-9 rounded-full items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : disabled ? 0.4 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Spracheingabe"
        >
          <Mic size={20} color={Colors.textSecondary} strokeWidth={2} />
        </Pressable>

        <View
          className="flex-1 rounded-2xl px-4 justify-center"
          style={{
            backgroundColor: '#F5F6F8',
            minHeight: 36,
            maxHeight: MAX_INPUT_HEIGHT,
          }}
        >
          <TextInput
            className="text-text-primary text-base"
            placeholderTextColor={Colors.textMuted}
            placeholder="Nachricht..."
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            multiline
            scrollEnabled
            textAlignVertical="center"
            style={{
              lineHeight: LINE_HEIGHT,
              paddingTop: 8,
              paddingBottom: 8,
              maxHeight: MAX_INPUT_HEIGHT,
            }}
            editable={!disabled}
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>

        {hasText && (
          <Pressable
            onPress={handleSend}
            disabled={disabled}
            className="h-9 w-9 rounded-full bg-primary items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : disabled ? 0.5 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Nachricht senden"
          >
            <Send size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default ChatInput;
