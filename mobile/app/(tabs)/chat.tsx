import React, { useMemo } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { OnboardingBar } from '@/components/chat/OnboardingBar';
import { useChat } from '@/lib/use-chat';
import { useAthleteProfile } from '@/lib/use-profile';
import { Colors } from '@/lib/colors';

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

function EmptyState({ onboarding }: { onboarding: boolean }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-text-primary text-base font-medium mb-2">
        {onboarding ? 'Willkommen!' : 'Hi.'}
      </Text>
      <Text className="text-text-secondary text-sm text-center leading-5">
        {onboarding
          ? 'Sag Ohm "Hi" damit er dich kennenlernen kann. Er fragt dich ein paar Sachen ueber dich und dein Training, damit er dich danach richtig coachen kann.'
          : 'Frag mich was zu deinem Training, deinem Schlaf oder deinem Wochenvolumen. Wenn deine Garmin-Daten verbunden sind kann ich konkrete Zahlen ziehen.'}
      </Text>
    </View>
  );
}

function subtitleFor(
  isStreaming: boolean,
  toolStatus: string | null,
  onboarding: boolean,
): string {
  if (toolStatus) return `${toolStatus}...`;
  if (isStreaming) return 'Ohm schreibt...';
  return onboarding ? 'Erstgespraech laeuft' : 'Ohm ist online';
}

export default function ChatScreen() {
  const profile = useAthleteProfile();
  const { messages, isStreaming, toolStatus, error, sendMessage } = useChat({
    onStreamComplete: () => {
      profile.refresh();
    },
  });

  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const isEmpty = messages.length === 0;
  const showOnboardingBar = !profile.isLoading && !profile.onboardingCompleted;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 bg-background">
        <GradientHeader
          title="Chat"
          subtitle={subtitleFor(isStreaming, toolStatus, showOnboardingBar)}
          rightContent={<StatusDot online={!error} />}
        />

        {showOnboardingBar && <OnboardingBar filledSections={profile.filledSections} />}

        {isEmpty ? (
          <EmptyState onboarding={showOnboardingBar} />
        ) : (
          <FlatList
            data={inverted}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

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
