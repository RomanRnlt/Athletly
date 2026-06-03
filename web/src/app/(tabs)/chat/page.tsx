'use client';
// SPDX-License-Identifier: MIT

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
import { Colors } from '@athletly/shared';
import { useT, type TranslateFn } from '@/i18n';

function CreditLimitBanner({ onUpgrade, t }: { onUpgrade: () => void; t: TranslateFn }) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="mx-4 mb-2 px-4 py-3 rounded-2xl bg-primary-light flex flex-row items-center gap-3 text-left"
      aria-label={t('chat.upgradeAria')}
    >
      <Crown size={18} color={Colors.primary} />
      <div className="flex-1">
        <p className="text-text-primary text-sm font-semibold">{t('chat.creditLimitTitle')}</p>
        <p className="text-text-secondary text-xs mt-0.5">{t('chat.creditLimitBody')}</p>
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

function EmptyState({ onboarding, t }: { onboarding: boolean; t: TranslateFn }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <p className="text-text-primary text-base font-medium mb-2">
        {onboarding ? t('chat.emptyWelcomeTitle') : t('chat.emptyHiTitle')}
      </p>
      <p className="text-text-secondary text-sm text-center leading-5 max-w-md">
        {onboarding ? t('chat.emptyOnboarding') : t('chat.emptyDefault')}
      </p>
    </div>
  );
}

function subtitleFor(
  t: TranslateFn,
  isStreaming: boolean,
  toolStatus: string | null,
  onboarding: boolean,
): string {
  if (toolStatus) return t('chat.subtitleTool', { status: toolStatus });
  if (isStreaming) return t('chat.subtitleStreaming');
  return onboarding ? t('chat.subtitleOnboarding') : t('chat.subtitleOnline');
}

export default function ChatScreen() {
  const t = useT();
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
        title={t('chat.title')}
        subtitle={subtitleFor(t, isStreaming, toolStatus, showOnboardingBar)}
        rightContent={<StatusDot online={!error} />}
        contentMaxWidthClass="md:max-w-[760px]"
      />

      {showOnboardingBar && <OnboardingBar filledSections={profile.filledSections} />}

      {isEmpty ? (
        <EmptyState onboarding={showOnboardingBar} t={t} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-3 md:px-10 md:pt-8">
          <div className="flex flex-col w-full mx-auto md:max-w-[760px]">
            {messages.map((item) => (
              <ChatBubble
                key={item.id}
                message={item}
                liveSteps={item.id === streamingId ? liveSteps : undefined}
                streamStartedAt={item.id === streamingId ? streamStartedAt : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-error-light">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}

      {exhausted && (
        <div className="w-full mx-auto md:max-w-[760px]">
          <CreditLimitBanner onUpgrade={() => router.push('/paywall')} t={t} />
        </div>
      )}

      <div className="md:px-6">
        <div className="w-full mx-auto md:max-w-[760px] md:mb-4 md:rounded-2xl md:border md:border-divider md:overflow-hidden md:shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
          <ChatInput onSend={sendMessage} disabled={isStreaming || exhausted} />
        </div>
      </div>
    </div>
  );
}
