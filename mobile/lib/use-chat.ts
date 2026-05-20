import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from './api';
import type { ChatMessage } from '@/types/chat';

interface UseChatOptions {
  initialMessages?: readonly ChatMessage[];
  onStreamComplete?: () => void;
}

interface UseChatReturn {
  messages: readonly ChatMessage[];
  isStreaming: boolean;
  toolStatus: string | null;
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
};

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
  const [error, setError] = useState<string | null>(null);
  const streamHandleRef = useRef<{ close: () => void } | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      streamHandleRef.current?.close();
    };
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
      streamingIdRef.current = assistantId;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      const next = [...messages, userMessage, assistantPlaceholder];
      setMessages(next);
      setError(null);
      setIsStreaming(true);
      setToolStatus(null);

      const historyForServer = [...messages, userMessage];

      streamHandleRef.current = streamChat(historyForServer, {
        onToken: (delta) => {
          setToolStatus(null);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current ? { ...m, content: m.content + delta } : m,
            ),
          );
        },
        onToolCall: (name) => {
          setToolStatus(TOOL_LABELS[name] ?? `Ruft ${name} auf`);
        },
        onToolResult: () => {
          setToolStatus(null);
        },
        onDone: () => {
          setIsStreaming(false);
          setToolStatus(null);
          streamingIdRef.current = null;
          streamHandleRef.current = null;
          onStreamComplete?.();
        },
        onError: (message) => {
          setError(message);
          setIsStreaming(false);
          setToolStatus(null);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, content: m.content || '[Verbindung zum Server fehlgeschlagen]' }
                : m,
            ),
          );
          streamingIdRef.current = null;
          streamHandleRef.current = null;
        },
      });
    },
    [messages, isStreaming, onStreamComplete],
  );

  const triggerWelcome = useCallback(() => {
    if (isStreaming || messages.length > 0) return;

    const assistantId = makeId('a');
    streamingIdRef.current = assistantId;
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages([placeholder]);
    setError(null);
    setIsStreaming(true);
    setToolStatus(null);

    // Synthetic trigger sent to the backend but NEVER added to the visible
    // message list. The agent reads it as "user has shown up" and responds
    // with the onboarding skill's opening turn.
    const trigger: ChatMessage = {
      id: 'trigger',
      role: 'user',
      content: 'Hi',
      timestamp: new Date(),
    };

    streamHandleRef.current = streamChat([trigger], {
      onToken: (delta) => {
        setToolStatus(null);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current ? { ...m, content: m.content + delta } : m,
          ),
        );
      },
      onToolCall: (name) => {
        setToolStatus(TOOL_LABELS[name] ?? `Ruft ${name} auf`);
      },
      onToolResult: () => {
        setToolStatus(null);
      },
      onDone: () => {
        setIsStreaming(false);
        setToolStatus(null);
        streamingIdRef.current = null;
        streamHandleRef.current = null;
        onStreamComplete?.();
      },
      onError: (message) => {
        setError(message);
        setIsStreaming(false);
        setToolStatus(null);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, content: m.content || '[Verbindung zum Server fehlgeschlagen]' }
              : m,
          ),
        );
        streamingIdRef.current = null;
        streamHandleRef.current = null;
      },
    });
  }, [messages, isStreaming, onStreamComplete]);

  return { messages, isStreaming, toolStatus, error, sendMessage, triggerWelcome };
}
