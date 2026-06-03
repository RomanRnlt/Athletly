import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Colors } from '@athletly/shared';
import { LiveActivity } from '@/components/chat/LiveActivity';
import { ShowWorkFooter } from '@/components/chat/ShowWorkFooter';
import type { ChatMessage, ToolStep } from '@athletly/shared';

interface ChatBubbleProps {
  message: ChatMessage;
  /** Live activity, passed only for the currently-streaming assistant message. */
  liveSteps?: readonly ToolStep[];
  /** Turn start, for the live elapsed timer. */
  streamStartedAt?: Date | null;
}

const BUBBLE_STYLE = {
  backgroundColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
} as const;

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function ThinkingPill() {
  return (
    <View
      className="flex-row items-center gap-2 rounded-2xl rounded-tl-sm px-4 py-3"
      style={BUBBLE_STYLE}
    >
      <ActivityIndicator size="small" color={Colors.textMuted} />
      <Text className="text-text-muted text-sm">Denke nach...</Text>
    </View>
  );
}

function AssistantBubble({
  message,
  liveSteps,
  streamStartedAt,
}: {
  message: ChatMessage;
  liveSteps?: readonly ToolStep[];
  streamStartedAt?: Date | null;
}) {
  const live = !!liveSteps && liveSteps.length > 0;
  const hasText = message.content.length > 0;
  const footerSteps = live ? undefined : message.toolSteps;

  return (
    <View className="self-start max-w-[92%] mb-3">
      {hasText ? (
        <View className="rounded-2xl rounded-tl-sm px-4 py-3" style={BUBBLE_STYLE}>
          <Text className="text-text-primary text-base leading-6">{message.content}</Text>
        </View>
      ) : null}

      {/* Current activity goes BELOW the text so far (more text may follow),
          showing only what the agent is doing now - not a checked history. */}
      {live ? (
        <View className={hasText ? 'mt-2' : undefined}>
          <LiveActivity steps={liveSteps as readonly ToolStep[]} startedAt={streamStartedAt ?? null} />
        </View>
      ) : !hasText ? (
        <ThinkingPill />
      ) : null}

      {footerSteps && footerSteps.length > 0 ? <ShowWorkFooter steps={footerSteps} /> : null}

      {hasText ? (
        <Text className="text-text-muted text-[10px] mt-1 ml-1">{formatTime(message.timestamp)}</Text>
      ) : null}
    </View>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <View className="self-end max-w-[85%] mb-3">
      <View className="bg-primary rounded-2xl rounded-tr-sm px-4 py-3">
        <Text className="text-white text-base leading-6">{message.content}</Text>
      </View>
      <Text className="text-text-muted text-[10px] mt-1 mr-1 text-right">
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

function SystemBubble({ message }: { message: ChatMessage }) {
  return (
    <View className="self-center max-w-[85%] mb-3 px-4 py-2">
      <Text className="text-text-muted text-sm italic text-center">{message.content}</Text>
    </View>
  );
}

export function ChatBubble({ message, liveSteps, streamStartedAt }: ChatBubbleProps) {
  switch (message.role) {
    case 'assistant':
      return (
        <AssistantBubble message={message} liveSteps={liveSteps} streamStartedAt={streamStartedAt} />
      );
    case 'user':
      return <UserBubble message={message} />;
    case 'system':
      return <SystemBubble message={message} />;
  }
}

export default ChatBubble;
