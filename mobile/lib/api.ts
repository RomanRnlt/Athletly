import Constants from 'expo-constants';
import EventSource from 'react-native-sse';
import { getAccessToken } from './supabase';
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
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, preview: string) => void;
  onDone: (id: string, model: string) => void;
  onError: (message: string) => void;
}

interface StreamHandle {
  close: () => void;
}

type StreamEvent = 'token' | 'tool_call' | 'tool_result' | 'done' | 'error';

function serializeMessages(messages: readonly ChatMessage[]): string {
  const slim = messages.map((m) => ({ role: m.role, content: m.content }));
  return JSON.stringify({ messages: slim });
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function withAuth(init: RequestInit): Promise<RequestInit> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const authed = await withAuth(init);
  let response: Response;
  try {
    response = await fetch(url, authed);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'network error';
    throw new ApiError(`Verbindung zum Server fehlgeschlagen (${reason})`, 0);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const detail =
      (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string'
        ? body.detail
        : null) ??
      (typeof body === 'string' && body.length > 0 ? body : null) ??
      `HTTP ${response.status}`;
    throw new ApiError(detail, response.status);
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export function streamChat(
  messages: readonly ChatMessage[],
  handlers: StreamHandlers,
): StreamHandle {
  const url = `${getApiBaseUrl()}/chat/stream`;
  let es: EventSource<StreamEvent> | null = null;

  // SSE needs the JWT in headers. EventSource constructor is sync, so we
  // resolve the token first and only then open the stream.
  getAccessToken()
    .then((token) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      es = new EventSource<StreamEvent>(url, {
        method: 'POST',
        headers,
        body: serializeMessages(messages),
        pollingInterval: 0,
      });

      es.addEventListener('token', (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data) as { delta?: string };
          if (payload.delta) handlers.onToken(payload.delta);
        } catch {
          // skip
        }
      });

      es.addEventListener('tool_call', (event) => {
        if (!event.data || !handlers.onToolCall) return;
        try {
          const payload = JSON.parse(event.data) as {
            name?: string;
            args?: Record<string, unknown>;
          };
          if (payload.name) handlers.onToolCall(payload.name, payload.args ?? {});
        } catch {
          // skip
        }
      });

      es.addEventListener('tool_result', (event) => {
        if (!event.data || !handlers.onToolResult) return;
        try {
          const payload = JSON.parse(event.data) as { name?: string; preview?: string };
          if (payload.name) handlers.onToolResult(payload.name, payload.preview ?? '');
        } catch {
          // skip
        }
      });

      es.addEventListener('done', (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data) as { id: string; model: string };
          handlers.onDone(payload.id, payload.model);
        } finally {
          es?.close();
        }
      });

      es.addEventListener('error', (event) => {
        const message =
          'message' in event && typeof event.message === 'string'
            ? event.message
            : 'Connection error';
        handlers.onError(message);
        es?.close();
      });
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : 'auth setup failed';
      handlers.onError(message);
    });

  return { close: () => es?.close() };
}
