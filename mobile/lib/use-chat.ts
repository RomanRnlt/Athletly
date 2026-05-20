import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from './api';
import type { ChatMessage } from '@/types/chat';

interface UseChatOptions {
  initialMessages?: readonly ChatMessage[];
}

interface UseChatReturn {
  messages: readonly ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChat({ initialMessages = [] }: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<readonly ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
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

      const historyForServer = [...messages, userMessage];

      streamHandleRef.current = streamChat(historyForServer, {
        onToken: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current ? { ...m, content: m.content + delta } : m,
            ),
          );
        },
        onDone: () => {
          setIsStreaming(false);
          streamingIdRef.current = null;
          streamHandleRef.current = null;
        },
        onError: (message) => {
          setError(message);
          setIsStreaming(false);
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
    [messages, isStreaming],
  );

  return { messages, isStreaming, error, sendMessage };
}
