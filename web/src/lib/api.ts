// Web port of mobile/lib/api.ts.
//
// Same backend (services/api), same endpoints, same request patterns. The one
// real difference is SSE: the backend's /chat/stream is a POST that needs a
// Bearer header, and the browser's native EventSource can neither POST nor set
// headers. So streamChat uses fetch + ReadableStream and parses the SSE wire
// format by hand, dispatching the exact same events as the mobile client
// (token, tool_call, tool_result, status, done, error).
import { getAccessToken } from './supabase';
import type { ChatMessage } from '@athletly/shared';

const DEFAULT_API_URL = 'http://localhost:8000';

/** Derive the API base URL from NEXT_PUBLIC_API_URL (mirrors EXPO_PUBLIC_API_URL). */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return DEFAULT_API_URL;
}

export interface ToolCallEvent {
  name: string;
  args: Record<string, unknown>;
  depth: number;
  agent: string;
}

export interface ToolResultEvent {
  name: string;
  preview: string;
  depth: number;
  agent: string;
}

export interface StatusEvent {
  label: string;
  depth: number;
  agent: string;
}

interface StreamHandlers {
  onToken: (delta: string) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onToolResult?: (event: ToolResultEvent) => void;
  onStatus?: (event: StatusEvent) => void;
  onDone: (id: string, model: string) => void;
  onError: (message: string) => void;
}

function asDepth(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asAgent(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : 'coach';
}

interface StreamHandle {
  close: () => void;
}

function serializeMessages(messages: readonly ChatMessage[]): string {
  const slim = messages.map((m) => ({ role: m.role, content: m.content }));
  return JSON.stringify({ messages: slim });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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

// --- SSE parsing -----------------------------------------------------------

type ParsedEvent = { event: string; data: string };

/**
 * Parse a chunk buffer into complete SSE events. Returns the parsed events and
 * the leftover (incomplete) tail to carry into the next chunk. Events are
 * separated by a blank line; within an event, `event:` and `data:` lines are
 * accumulated (data lines join with "\n", per the SSE spec).
 */
function drainEvents(buffer: string): { events: ParsedEvent[]; rest: string } {
  const events: ParsedEvent[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const block of parts) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const rawLine of block.split('\n')) {
      const line = rawLine.replace(/\r$/, '');
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') });
  }
  return { events, rest };
}

function dispatch(parsed: ParsedEvent, handlers: StreamHandlers): boolean {
  const { event, data } = parsed;
  if (!data) return false;

  if (event === 'token') {
    try {
      const payload = JSON.parse(data) as { delta?: string };
      if (payload.delta) handlers.onToken(payload.delta);
    } catch {
      // skip
    }
    return false;
  }

  if (event === 'tool_call' && handlers.onToolCall) {
    try {
      const p = JSON.parse(data) as {
        name?: string;
        args?: Record<string, unknown>;
        depth?: unknown;
        agent?: unknown;
      };
      if (p.name) {
        handlers.onToolCall({
          name: p.name,
          args: p.args ?? {},
          depth: asDepth(p.depth),
          agent: asAgent(p.agent),
        });
      }
    } catch {
      // skip
    }
    return false;
  }

  if (event === 'tool_result' && handlers.onToolResult) {
    try {
      const p = JSON.parse(data) as {
        name?: string;
        preview?: string;
        depth?: unknown;
        agent?: unknown;
      };
      if (p.name) {
        handlers.onToolResult({
          name: p.name,
          preview: p.preview ?? '',
          depth: asDepth(p.depth),
          agent: asAgent(p.agent),
        });
      }
    } catch {
      // skip
    }
    return false;
  }

  if (event === 'status' && handlers.onStatus) {
    try {
      const p = JSON.parse(data) as { label?: string; depth?: unknown; agent?: unknown };
      if (p.label) {
        handlers.onStatus({
          label: p.label,
          depth: asDepth(p.depth),
          agent: asAgent(p.agent),
        });
      }
    } catch {
      // skip
    }
    return false;
  }

  if (event === 'done') {
    try {
      const payload = JSON.parse(data) as { id: string; model: string };
      handlers.onDone(payload.id, payload.model);
    } catch {
      handlers.onDone('', '');
    }
    return true; // terminal
  }

  if (event === 'error') {
    try {
      const payload = JSON.parse(data) as { message?: string };
      handlers.onError(payload.message ?? 'Connection error');
    } catch {
      handlers.onError('Connection error');
    }
    return true; // terminal
  }

  return false;
}

/**
 * Open a fetch-based SSE stream to /chat/stream. Returns a handle whose close()
 * aborts the in-flight request. Mirrors mobile streamChat's handler contract.
 */
export function streamChat(
  messages: readonly ChatMessage[],
  handlers: StreamHandlers,
): StreamHandle {
  const url = `${getApiBaseUrl()}/chat/stream`;
  const controller = new AbortController();

  (async () => {
    let token: string | null = null;
    try {
      token = await getAccessToken();
    } catch (err) {
      handlers.onError(err instanceof Error ? err.message : 'auth setup failed');
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: serializeMessages(messages),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      const reason = err instanceof Error ? err.message : 'network error';
      handlers.onError(`Verbindung zum Server fehlgeschlagen (${reason})`);
      return;
    }

    if (!response.ok || !response.body) {
      // Surface the backend detail (e.g. 402 credits, 403 consent) like the
      // request() helper does for non-streaming calls.
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body && typeof body.detail === 'string') detail = body.detail;
      } catch {
        // ignore
      }
      handlers.onError(detail);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = drainEvents(buffer);
        buffer = rest;
        for (const ev of events) {
          const terminal = dispatch(ev, handlers);
          if (terminal) {
            controller.abort();
            return;
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const reason = err instanceof Error ? err.message : 'stream error';
      handlers.onError(reason);
    }
  })();

  return { close: () => controller.abort() };
}
