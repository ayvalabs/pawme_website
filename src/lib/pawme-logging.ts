import type { NextRequest } from 'next/server';

/**
 * Shared structured-logging helper for PawMe mobile API routes.
 * Emits single-line JSON so Vercel's log aggregation can parse it.
 */

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getRequestId(request: NextRequest): string {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-correlation-id') ||
    randomId()
  );
}

type LogLevel = 'info' | 'warn' | 'error';

interface LogFields {
  requestId: string;
  endpoint: string;
  uid?: string | null;
  durationMs?: number;
  status?: number;
  success?: boolean;
  model?: string;
  error?: string;
  errorCode?: string | number;
  // anything extra
  [key: string]: unknown;
}

/**
 * Truncate a string for safe logging (never dump raw base64 into logs).
 */
export function safePreview(value: unknown, max = 240): string {
  if (value === undefined || value === null) return '';
  const str = typeof value === 'string' ? value : (() => {
    try { return JSON.stringify(value); } catch { return String(value); }
  })();
  return str.length > max ? `${str.slice(0, max)}…(+${str.length - max})` : str;
}

/** Approximate base64 decoded byte size. */
export function base64ApproxBytes(base64: string | undefined | null): number {
  if (!base64) return 0;
  const trimmed = base64.replace(/^data:.+;base64,/, '');
  const padding = trimmed.endsWith('==') ? 2 : trimmed.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(trimmed.length * 0.75) - padding);
}

export function logApi(level: LogLevel, fields: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    ...fields,
  };
  const line = `[pawme-api] ${JSON.stringify(payload)}`;
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Thin helper that wraps an async handler with timing + structured failure logs.
 * The handler must return `{ status, body }` so we can echo the request ID.
 */
export async function runApi<T>(
  opts: {
    endpoint: string;
    request: NextRequest;
    extraFields?: Record<string, unknown>;
  },
  handler: (ctx: { requestId: string; logInfo: (f: Partial<LogFields>) => void }) => Promise<T>,
): Promise<{ requestId: string; result: T | null; error: unknown; durationMs: number }> {
  const requestId = getRequestId(opts.request);
  const start = Date.now();

  let extraInfo: Partial<LogFields> = {};
  const logInfo = (f: Partial<LogFields>) => {
    extraInfo = { ...extraInfo, ...f };
  };

  logApi('info', {
    requestId,
    endpoint: opts.endpoint,
    event: 'start',
    ...opts.extraFields,
  });

  try {
    const result = await handler({ requestId, logInfo });
    const durationMs = Date.now() - start;
    logApi('info', {
      requestId,
      endpoint: opts.endpoint,
      event: 'done',
      durationMs,
      success: true,
      ...opts.extraFields,
      ...extraInfo,
    });
    return { requestId, result, error: null, durationMs };
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logApi('error', {
      requestId,
      endpoint: opts.endpoint,
      event: 'failed',
      durationMs,
      success: false,
      error: safePreview(message, 800),
      stack: safePreview(stack, 1500),
      ...opts.extraFields,
      ...extraInfo,
    });
    return { requestId, result: null, error, durationMs };
  }
}
