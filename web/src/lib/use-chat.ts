'use client';

// Ported 1:1 from mobile/lib/use-chat.ts. The streaming contract is identical;
// streamChat (api.ts) abstracts away the EventSource vs fetch-SSE difference.
import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from './api';
import type { StatusEvent, ToolCallEvent, ToolResultEvent } from './api';
import type { ChatMessage, ToolStep, ToolStepStatus } from '@/types/chat';

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

const TOOL_LABELS: Record<string, string> = {
  search_activities: 'Sucht deine Aktivitaeten',
  get_activity_details: 'Schaut sich einen Workout genauer an',
  get_daily_metrics: 'Liest deine Gesundheitsdaten',
  get_weekly_load: 'Berechnet dein Wochenvolumen',
  web_search: 'Recherchiert im Web',
  read_athlete_profile: 'Liest dein Profil',
  update_athlete_section: 'Aktualisiert dein Profil',
  run_specialist: 'Startet einen Spezialisten-Agenten',
  evaluate_plan: 'Laesst den Plan bewerten',
  submit_plan: 'Finalisiert den Plan',
  submit_evaluation: 'Gibt die Bewertung ab',
  get_current_plan: 'Liest deinen Plan',
  update_plan: 'Passt den Plan an',
  confirm_plan: 'Aktiviert den Plan',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? `Ruft ${name} auf`;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChat({
  initialMessages = [],
  onStreamComplete,
}: UseChatOptions = {}): UseChatReturn {
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
        const label = toolLabel(e.name);
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
              ? { ...m, content: m.content || '[Verbindung zum Server fehlgeschlagen]' }
              : m,
          ),
        );
        streamingIdRef.current = null;
        streamHandleRef.current = null;
      },
    }),
    [onStreamComplete, resolveStep],
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

      streamHandleRef.current = streamChat([...messages, userMessage], makeHandlers(assistantId));
    },
    [messages, isStreaming, beginTurn, makeHandlers],
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

    const trigger: ChatMessage = {
      id: 'trigger',
      role: 'user',
      content: 'Hi',
      timestamp: new Date(),
    };
    streamHandleRef.current = streamChat([trigger], makeHandlers(assistantId));
  }, [messages, isStreaming, beginTurn, makeHandlers]);

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
