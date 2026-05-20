import Constants from 'expo-constants';
import EventSource from 'react-native-sse';
import type { ChatMessage } from '@/types/chat';

const API_PORT = 8000;
const LOCALHOST_FALLBACK = `http://localhost:${API_PORT}`;

/**
 * Derive the API base URL.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL (explicit override, e.g. for prod or tunnels)
 *   2. Expo's Metro host (works for both simulator and real device on LAN
 *      because Expo already exposes the Mac's reachable IP there)
 *   3. localhost (web / last resort)
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Older Expo manifest shape, kept as fallback.
    (Constants as unknown as { manifest?: { hostUri?: string } }).manifest?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host.length > 0) return `http://${host}:${API_PORT}`;
  }

  return LOCALHOST_FALLBACK;
}

interface StreamHandlers {
  onToken: (delta: string) => void;
  onDone: (id: string, model: string) => void;
  onError: (message: string) => void;
}

interface StreamHandle {
  close: () => void;
}

type StreamEvent = 'token' | 'done' | 'error';

function serializeMessages(messages: readonly ChatMessage[]): string {
  const slim = messages.map((m) => ({ role: m.role, content: m.content }));
  return JSON.stringify({ messages: slim });
}

export function streamChat(
  messages: readonly ChatMessage[],
  handlers: StreamHandlers,
): StreamHandle {
  const url = `${getApiBaseUrl()}/chat/stream`;

  const es = new EventSource<StreamEvent>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializeMessages(messages),
    pollingInterval: 0,
  });

  es.addEventListener('token', (event) => {
    if (!event.data) return;
    try {
      const payload = JSON.parse(event.data) as { delta?: string };
      if (payload.delta) handlers.onToken(payload.delta);
    } catch {
      // skip malformed chunk
    }
  });

  es.addEventListener('done', (event) => {
    if (!event.data) return;
    try {
      const payload = JSON.parse(event.data) as { id: string; model: string };
      handlers.onDone(payload.id, payload.model);
    } finally {
      es.close();
    }
  });

  es.addEventListener('error', (event) => {
    const message =
      'message' in event && typeof event.message === 'string'
        ? event.message
        : 'Connection error';
    handlers.onError(message);
    es.close();
  });

  return { close: () => es.close() };
}
