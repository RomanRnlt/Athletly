'use client';

// Web port of mobile/app/(tabs)/chat.tsx. The inverted FlatList becomes a
// normal scroll column that auto-scrolls to the latest message. Same SSE
// streaming, onboarding bar, credit-limit banner, and proactive welcome turn.
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { OnboardingBar } from '@/components/chat/OnboardingBar';
import { useChat } from '@/lib/use-chat';
import { useAthleteProfile } from '@/lib/use-profile';
import { useUsage } from '@/lib/use-usage';
import { Colors } from '@/lib/colors';

function CreditLimitBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="mx-4 mb-2 px-4 py-3 rounded-2xl bg-primary-light flex flex-row items-center gap-3 text-left"
      aria-label="Auf Pro upgraden"
    >
      <Crown size={18} color={Colors.primary} />
      <div className="flex-1">
        <p className="text-text-primary text-sm font-semibold">KI-Limit erreicht</p>
        <p className="text-text-secondary text-xs mt-0.5">
          Dein Kontingent ist aufgebraucht. Tippe fuer Upgrade auf Pro.
        </p>
      </div>
    </button>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <div className="flex flex-row items-center gap-2 mt-2">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: online ? Colors.success : Colors.textMuted }}
      />
    </div>
  );
}

function EmptyState({ onboarding }: { onboarding: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <p className="text-text-primary text-base font-medium mb-2">{onboarding ? 'Willkommen!' : 'Hi.'}</p>
      <p className="text-text-secondary text-sm text-center leading-5">
        {onboarding
          ? 'Sag Ohm "Hi" damit er dich kennenlernen kann. Er fragt dich ein paar Sachen ueber dich und dein Training, damit er dich danach richtig coachen kann.'
          : 'Frag mich was zu deinem Training, deinem Schlaf oder deinem Wochenvolumen. Wenn deine Garmin-Daten verbunden sind kann ich konkrete Zahlen ziehen.'}
      </p>
    </div>
  );
}

function subtitleFor(isStreaming: boolean, toolStatus: string | null, onboarding: boolean): string {
  if (toolStatus) return `${toolStatus}...`;
  if (isStreaming) return 'Ohm schreibt...';
  return onboarding ? 'Erstgespraech laeuft' : 'Ohm ist online';
}

export default function ChatScreen() {
  const router = useRouter();
  const profile = useAthleteProfile();
  const { exhausted, refresh: refreshUsage } = useUsage();
  const {
    messages,
    isStreaming,
    toolStatus,
    liveSteps,
    streamingId,
    streamStartedAt,
    error,
    sendMessage,
    triggerWelcome,
  } = useChat({
    onStreamComplete: () => {
      profile.refresh();
      refreshUsage();
    },
  });

  const isEmpty = messages.length === 0;
  const showOnboardingBar = !profile.isLoading && !profile.onboardingCompleted;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest message as content streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, liveSteps]);

  // Proactive first message (coach-initiated onboarding opening turn).
  useEffect(() => {
    if (profile.isLoading) return;
    if (profile.onboardingCompleted) return;
    if (profile.filledSections > 0) return;
    if (messages.length > 0 || isStreaming) return;
    triggerWelcome();
  }, [
    profile.isLoading,
    profile.onboardingCompleted,
    profile.filledSections,
    messages.length,
    isStreaming,
    triggerWelcome,
  ]);

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <GradientHeader
        title="Chat"
        subtitle={subtitleFor(isStreaming, toolStatus, showOnboardingBar)}
        rightContent={<StatusDot online={!error} />}
      />

      {showOnboardingBar && <OnboardingBar filledSections={profile.filledSections} />}

      {isEmpty ? (
        <EmptyState onboarding={showOnboardingBar} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-3 flex flex-col">
          {messages.map((item) => (
            <ChatBubble
              key={item.id}
              message={item}
              liveSteps={item.id === streamingId ? liveSteps : undefined}
              streamStartedAt={item.id === streamingId ? streamStartedAt : undefined}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-error-light">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}

      {exhausted && <CreditLimitBanner onUpgrade={() => router.push('/paywall')} />}

      <ChatInput onSend={sendMessage} disabled={isStreaming || exhausted} />
    </div>
  );
}
