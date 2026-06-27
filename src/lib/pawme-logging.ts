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

/** Keys whose values are redacted in logs (binary / credential data). */
const LOG_REDACT_KEYS = new Set([
  'imageBase64', 'base64', 'jwsRepresentation', 'purchaseToken',
  'originalJson', 'signature',
]);

/**
 * Recursively sanitise a value for structured logging:
 *   – redacts known large/sensitive keys
 *   – truncates strings >400 chars
 *   – caps arrays at 20 items
 *   – stops recursing after 4 levels
 */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 400 ? `${value.slice(0, 400)}\u2026(+${value.length - 400})` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const sliced = value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
    return value.length > 20 ? [...sliced, `\u2026(+${value.length - 20} more)`] : sliced;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (LOG_REDACT_KEYS.has(k)) {
        out[k] = typeof v === 'string' ? `[${v.length} chars redacted]` : '[redacted]';
      } else if (k === 'frames' && Array.isArray(v)) {
        out[k] = `[${v.length} frame(s) redacted]`;
      } else {
        out[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return out;
  }
  return value;
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

  // Best-effort: capture a sanitized snapshot of the incoming request for logging.
  let reqLog: Record<string, unknown> | undefined;
  try {
    const method = opts.request.method.toUpperCase();
    if (method === 'GET') {
      const params: Record<string, string> = {};
      opts.request.nextUrl.searchParams.forEach((v, k) => { params[k] = v; });
      if (Object.keys(params).length) reqLog = params;
    } else {
      const ct = opts.request.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const raw = await opts.request.clone().json().catch(() => null);
        if (raw && typeof raw === 'object') {
          reqLog = sanitizeForLog(raw) as Record<string, unknown>;
        }
      }
    }
  } catch {
    // best-effort — never block the actual handler
  }

  let extraInfo: Partial<LogFields> = {};
  const logInfo = (f: Partial<LogFields>) => {
    extraInfo = { ...extraInfo, ...f };
  };

  logApi('info', {
    requestId,
    endpoint: opts.endpoint,
    event: 'start',
    method: opts.request.method,
    ...(reqLog ? { requestBody: reqLog } : {}),
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
      responseBody: sanitizeForLog(result),
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
