import React, { useMemo } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChat } from '@/lib/use-chat';
import { mockChatMessages } from '@/lib/mock-data';
import { Colors } from '@/lib/colors';
import type { ChatMessage } from '@/types/chat';

function StatusDot({ online }: { online: boolean }) {
  return (
    <View className="flex-row items-center gap-2 mt-2">
      <View
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: online ? Colors.success : Colors.textMuted }}
      />
    </View>
  );
}

export default function ChatScreen() {
  const initial = useMemo<ChatMessage[]>(() => [...mockChatMessages], []);
  const { messages, isStreaming, error, sendMessage } = useChat({ initialMessages: initial });

  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 bg-background">
        <GradientHeader
          title="Chat"
          subtitle={isStreaming ? 'Ohm schreibt...' : 'Ohm ist online'}
          rightContent={<StatusDot online={!error} />}
        />

        <FlatList
          data={inverted}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        />

        {error && (
          <View className="px-4 py-2 bg-error-light">
            <Text className="text-error text-xs">{error}</Text>
          </View>
        )}

        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </View>
    </KeyboardAvoidingView>
  );
}
