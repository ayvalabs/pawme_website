import { logApi, safePreview } from './pawme-logging';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Known-stable generally-available Gemini models as of April 2026.
// Order matters: we try fastest/cheapest first, fall back to more capable.
// 1.5 family has been removed; 2.0-flash is deprecated for new users.
// Override with GEMINI_TEXT_MODELS / GEMINI_VISION_MODELS env vars (comma-separated).
const DEFAULT_TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-flash-latest',
];

const DEFAULT_VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-flash-latest',
];

function modelsFromEnv(varName: string, fallback: string[]): string[] {
  const raw = process.env[varName];
  if (!raw) return fallback;
  const parsed = raw
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  return parsed.length > 0 ? parsed : fallback;
}

const GEMINI_TEXT_MODELS = modelsFromEnv('GEMINI_TEXT_MODELS', DEFAULT_TEXT_MODELS);
const GEMINI_VISION_MODELS = modelsFromEnv('GEMINI_VISION_MODELS', DEFAULT_VISION_MODELS);

function endpointForModel(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}

function cleanGeminiText(text: string) {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

export interface GeminiResult {
  text: string;
  modelUsed: string;
  totalMs: number;
  attempts: Array<{ model: string; ok: boolean; status?: number; durationMs: number; error?: string }>;
}

export interface GeminiContext {
  requestId?: string;
  endpoint?: string;
}

async function runGeminiRequest(
  models: string[],
  body: string,
  ctx?: GeminiContext,
): Promise<GeminiResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const attempts: GeminiResult['attempts'] = [];
  const overallStart = Date.now();
  let lastError = 'Unknown Gemini error';

  for (const model of models) {
    const url = endpointForModel(model);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const durationMs = Date.now() - start;

      if (!response.ok) {
        const errorText = await response.text();
        lastError = errorText || `Gemini returned ${response.status}`;
        attempts.push({ model, ok: false, status: response.status, durationMs, error: safePreview(lastError, 400) });
        logApi('warn', {
          requestId: ctx?.requestId || 'no-req-id',
          endpoint: ctx?.endpoint || 'gemini',
          event: 'gemini-attempt-failed',
          model,
          status: response.status,
          durationMs,
          error: safePreview(lastError, 400),
        });
        continue;
      }

      const data = await response.json();
      const text: string = data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part?.text || '')
        .join('\n') || '';

      if (text) {
        attempts.push({ model, ok: true, status: 200, durationMs });
        logApi('info', {
          requestId: ctx?.requestId || 'no-req-id',
          endpoint: ctx?.endpoint || 'gemini',
          event: 'gemini-attempt-ok',
          model,
          durationMs,
          textLength: text.length,
        });
        return { text, modelUsed: model, totalMs: Date.now() - overallStart, attempts };
      }

      lastError = 'Gemini returned an empty response';
      attempts.push({ model, ok: false, status: 200, durationMs, error: lastError });
      logApi('warn', {
        requestId: ctx?.requestId || 'no-req-id',
        endpoint: ctx?.endpoint || 'gemini',
        event: 'gemini-empty-response',
        model,
        durationMs,
      });
    } catch (error) {
      const durationMs = Date.now() - start;
      lastError = error instanceof Error ? error.message : String(error);
      attempts.push({ model, ok: false, durationMs, error: safePreview(lastError, 400) });
      logApi('warn', {
        requestId: ctx?.requestId || 'no-req-id',
        endpoint: ctx?.endpoint || 'gemini',
        event: 'gemini-fetch-error',
        model,
        durationMs,
        error: safePreview(lastError, 400),
      });
    }
  }

  const err: Error & { attempts?: GeminiResult['attempts'] } = new Error(lastError);
  err.attempts = attempts;
  throw err;
}

interface GeminiGenerateOptions {
  /** When true, request JSON output from Gemini (response_mime_type). */
  jsonMode?: boolean;
}

function buildBody(parts: Array<Record<string, unknown>>, opts?: GeminiGenerateOptions): string {
  const payload: Record<string, unknown> = {
    contents: [{ parts }],
  };
  if (opts?.jsonMode) {
    payload.generationConfig = {
      response_mime_type: 'application/json',
      temperature: 0.2,
    };
  }
  return JSON.stringify(payload);
}

export async function generateGeminiText(
  prompt: string,
  ctx?: GeminiContext,
): Promise<GeminiResult> {
  const body = buildBody([{ text: prompt }]);
  return runGeminiRequest(GEMINI_TEXT_MODELS, body, ctx);
}

export async function generateGeminiVisionText(
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
  ctx?: GeminiContext,
): Promise<GeminiResult> {
  const cleanBase64 = imageBase64.replace(/^data:.+;base64,/, '');
  const body = buildBody([
    { text: prompt },
    {
      inline_data: {
        mime_type: mimeType,
        data: cleanBase64,
      },
    },
  ]);

  return runGeminiRequest(GEMINI_VISION_MODELS, body, ctx);
}

export async function generateGeminiJson<T>(
  prompt: string,
  imageBase64?: string,
  mimeType?: string,
  ctx?: GeminiContext,
): Promise<{ data: T; modelUsed: string; totalMs: number }> {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:.+;base64,/, '');
    parts.push({
      inline_data: {
        mime_type: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    });
  }

  // jsonMode: ask Gemini to return raw JSON (no markdown fences) so we don't
  // have to strip ``` and risk parse failures.
  const body = buildBody(parts, { jsonMode: true });
  const result = await runGeminiRequest(
    imageBase64 ? GEMINI_VISION_MODELS : GEMINI_TEXT_MODELS,
    body,
    ctx,
  );

  const cleaned = cleanGeminiText(result.text);

  try {
    const parsed = JSON.parse(cleaned) as T;
    return { data: parsed, modelUsed: result.modelUsed, totalMs: result.totalMs };
  } catch (error) {
    const preview = cleaned.slice(0, 1200);
    logApi('error', {
      requestId: ctx?.requestId || 'no-req-id',
      endpoint: ctx?.endpoint || 'gemini',
      event: 'gemini-json-parse-failed',
      model: result.modelUsed,
      error: error instanceof Error ? error.message : String(error),
      preview,
    });
    throw new Error('Gemini returned invalid JSON: ' + preview);
  }
}

export interface GeminiFrame {
  base64: string;
  mimeType?: string;
  /** Optional human label for this frame (e.g. "frame 1 of 5", "0:08") */
  label?: string;
}

/**
 * Multi-image variant of generateGeminiJson. Useful for video frame analysis
 * where we sample N stills from a short clip and ask Gemini to reason across them.
 */
export async function generateGeminiJsonMulti<T>(
  prompt: string,
  frames: GeminiFrame[],
  ctx?: GeminiContext,
): Promise<{ data: T; modelUsed: string; totalMs: number }> {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  for (const frame of frames) {
    if (!frame?.base64) continue;
    const cleanBase64 = frame.base64.replace(/^data:.+;base64,/, '');
    if (frame.label) {
      parts.push({ text: `[${frame.label}]` });
    }
    parts.push({
      inline_data: {
        mime_type: frame.mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    });
  }

  const body = buildBody(parts, { jsonMode: true });
  const result = await runGeminiRequest(GEMINI_VISION_MODELS, body, ctx);
  const cleaned = cleanGeminiText(result.text);

  try {
    const parsed = JSON.parse(cleaned) as T;
    return { data: parsed, modelUsed: result.modelUsed, totalMs: result.totalMs };
  } catch (error) {
    const preview = cleaned.slice(0, 1200);
    logApi('error', {
      requestId: ctx?.requestId || 'no-req-id',
      endpoint: ctx?.endpoint || 'gemini',
      event: 'gemini-json-parse-failed-multi',
      model: result.modelUsed,
      error: error instanceof Error ? error.message : String(error),
      preview,
    });
    throw new Error('Gemini returned invalid JSON: ' + preview);
  }
}
