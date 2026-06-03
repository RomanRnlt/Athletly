'use client';
// SPDX-License-Identifier: MIT

// Ported 1:1 from mobile/lib/use-chat.ts. The streaming contract is identical;
// streamChat (api.ts) abstracts away the EventSource vs fetch-SSE difference.
import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from './api';
import type { StatusEvent, ToolCallEvent, ToolResultEvent } from './api';
import type { ChatMessage, ToolStep, ToolStepStatus } from '@athletly/shared';
import { DEMO_MODE, replayScriptedTurn, replayWelcome } from './demo';
import { useT } from '@/i18n';
import type { MessageKey, TranslateFn } from '@/i18n';

interface UseChatOptions {
  initialMessages?: readonly ChatMessage[];
  onStreamComplete?: () => void;
}

interface UseChatReturn {
  messages: readonly ChatMessage[];
  isStreaming: boolean;
  toolStatus: string | null;
  liveSteps: readonly ToolStep[];
  streamingId: string | null;
  streamStartedAt: Date | null;
  error: string | null;
  sendMessage: (text: string) => void;
  triggerWelcome: () => void;
}

const KNOWN_TOOLS = new Set<string>([
  'search_activities',
  'get_activity_details',
  'get_daily_metrics',
  'get_weekly_load',
  'web_search',
  'read_athlete_profile',
  'update_athlete_section',
  'run_specialist',
  'evaluate_plan',
  'submit_plan',
  'submit_evaluation',
  'get_current_plan',
  'update_plan',
  'confirm_plan',
]);

function toolLabel(t: TranslateFn, name: string): string {
  return KNOWN_TOOLS.has(name) ? t(`tool.${name}` as MessageKey) : t('tool.fallback', { name });
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChat({
  initialMessages = [],
  onStreamComplete,
}: UseChatOptions = {}): UseChatReturn {
  const t = useT();
  const [messages, setMessages] = useState<readonly ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [liveSteps, setLiveSteps] = useState<readonly ToolStep[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamStartedAt, setStreamStartedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamHandleRef = useRef<{ close: () => void } | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      streamHandleRef.current?.close();
    };
  }, []);

  const resolveStep = useCallback(
    (name: string, depth: number, status: ToolStepStatus) => {
      setLiveSteps((prev) => {
        for (let i = prev.length - 1; i >= 0; i -= 1) {
          const s = prev[i];
          if (s.kind === 'tool' && s.status === 'running' && s.toolName === name && s.depth === depth) {
            const next = [...prev];
            next[i] = { ...s, status };
            return next;
          }
        }
        return prev;
      });
    },
    [],
  );

  const makeHandlers = useCallback(
    (assistantId: string) => ({
      onToken: (delta: string) => {
        setToolStatus(null);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
        );
      },
      onToolCall: (e: ToolCallEvent) => {
        const label = toolLabel(t, e.name);
        setToolStatus(label);
        setLiveSteps((prev) => [
          ...prev,
          {
            id: makeId('step'),
            toolName: e.name,
            displayLabel: label,
            status: 'running' as ToolStepStatus,
            depth: e.depth,
            agent: e.agent,
            kind: 'tool' as const,
          },
        ]);
      },
      onToolResult: (e: ToolResultEvent) => {
        const failed = e.preview.startsWith('error');
        resolveStep(e.name, e.depth, failed ? 'error' : 'done');
      },
      onStatus: (e: StatusEvent) => {
        setToolStatus(e.label);
        setLiveSteps((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.kind === 'status' && last.displayLabel === e.label && last.depth === e.depth) {
            return prev;
          }
          return [
            ...prev,
            {
              id: makeId('step'),
              toolName: '',
              displayLabel: e.label,
              status: 'done' as ToolStepStatus,
              depth: e.depth,
              agent: e.agent,
              kind: 'status' as const,
            },
          ];
        });
      },
      onDone: () => {
        setLiveSteps((steps) => {
          const frozen = steps.map((s) =>
            s.status === 'running' ? { ...s, status: 'done' as ToolStepStatus } : s,
          );
          if (frozen.length > 0) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, toolSteps: frozen } : m)),
            );
          }
          return [];
        });
        setIsStreaming(false);
        setToolStatus(null);
        setStreamingId(null);
        streamingIdRef.current = null;
        streamHandleRef.current = null;
        onStreamComplete?.();
      },
      onError: (message: string) => {
        setError(message);
        setIsStreaming(false);
        setToolStatus(null);
        setLiveSteps([]);
        setStreamingId(null);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || t('chat.connectionFailed') }
              : m,
          ),
        );
        streamingIdRef.current = null;
        streamHandleRef.current = null;
      },
    }),
    [onStreamComplete, resolveStep, t],
  );

  const beginTurn = useCallback((assistantId: string) => {
    streamingIdRef.current = assistantId;
    setStreamingId(assistantId);
    setError(null);
    setIsStreaming(true);
    setToolStatus(null);
    setLiveSteps([]);
    setStreamStartedAt(new Date());
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || isStreaming) return;

      const userMessage: ChatMessage = {
        id: makeId('u'),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };
      const assistantId = makeId('a');
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages([...messages, userMessage, assistantPlaceholder]);
      beginTurn(assistantId);

      streamHandleRef.current = DEMO_MODE
        ? replayScriptedTurn(t, makeHandlers(assistantId))
        : streamChat([...messages, userMessage], makeHandlers(assistantId));
    },
    [messages, isStreaming, beginTurn, makeHandlers, t],
  );

  const triggerWelcome = useCallback(() => {
    if (isStreaming || messages.length > 0) return;

    const assistantId = makeId('a');
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages([placeholder]);
    beginTurn(assistantId);

    if (DEMO_MODE) {
      streamHandleRef.current = replayWelcome(t, makeHandlers(assistantId));
      return;
    }

    const trigger: ChatMessage = {
      id: 'trigger',
      role: 'user',
      content: 'Hi',
      timestamp: new Date(),
    };
    streamHandleRef.current = streamChat([trigger], makeHandlers(assistantId));
  }, [messages, isStreaming, beginTurn, makeHandlers, t]);

  return {
    messages,
    isStreaming,
    toolStatus,
    liveSteps,
    streamingId,
    streamStartedAt,
    error,
    sendMessage,
    triggerWelcome,
  };
}
