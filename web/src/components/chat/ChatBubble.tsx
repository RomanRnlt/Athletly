'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/chat/ChatBubble.tsx.
import React from 'react';
import { Colors } from '@athletly/shared';
import { LiveActivity } from './LiveActivity';
import { ShowWorkFooter } from './ShowWorkFooter';
import type { ChatMessage, ToolStep } from '@athletly/shared';

interface ChatBubbleProps {
  message: ChatMessage;
  liveSteps?: readonly ToolStep[];
  streamStartedAt?: Date | null;
}

const BUBBLE_STYLE: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function ThinkingPill() {
  return (
    <div
      className="inline-flex flex-row items-center gap-2 rounded-2xl rounded-tl-sm px-4 py-3"
      style={BUBBLE_STYLE}
    >
      <span
        className="inline-block h-4 w-4 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: Colors.textMuted, borderRightColor: Colors.textMuted }}
        aria-hidden
      />
      <span className="text-text-muted text-sm">Denke nach...</span>
    </div>
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
    <div className="self-start max-w-[92%] mb-3 flex flex-col items-start">
      {hasText ? (
        <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={BUBBLE_STYLE}>
          <p className="text-text-primary text-base leading-6 whitespace-pre-wrap">{message.content}</p>
        </div>
      ) : null}

      {live ? (
        <div className={hasText ? 'mt-2 w-full' : 'w-full'}>
          <LiveActivity steps={liveSteps as readonly ToolStep[]} startedAt={streamStartedAt ?? null} />
        </div>
      ) : !hasText ? (
        <ThinkingPill />
      ) : null}

      {footerSteps && footerSteps.length > 0 ? <ShowWorkFooter steps={footerSteps} /> : null}

      {hasText ? (
        <span className="text-text-muted text-[10px] mt-1 ml-1">{formatTime(message.timestamp)}</span>
      ) : null}
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="self-end max-w-[85%] mb-3 flex flex-col items-end ml-auto">
      <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-3">
        <p className="text-white text-base leading-6 whitespace-pre-wrap">{message.content}</p>
      </div>
      <span className="text-text-muted text-[10px] mt-1 mr-1 text-right">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}

function SystemBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="self-center max-w-[85%] mb-3 px-4 py-2 mx-auto">
      <p className="text-text-muted text-sm italic text-center">{message.content}</p>
    </div>
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
