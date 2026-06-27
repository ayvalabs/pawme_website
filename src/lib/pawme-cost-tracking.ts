/**
 * src/lib/pawme-cost-tracking.ts
 *
 * Per-user AI cost tracking. Every Gemini call from `/api/mobile/gemini-*`
 * passes its `GeminiResult.usage` (token counts) plus the calling user's
 * id into `recordAiUsage()` below. We price the call at the time of the
 * request — pricing tables here are snapshotted, so historical
 * costs remain accurate even when Google updates prices.
 *
 * Firestore schema:
 *
 *   users/{userId}/aiUsage/{YYYY-MM}/
 *     month               (YYYY-MM)
 *     totalInputTokens    number
 *     totalOutputTokens   number
 *     totalTokens         number
 *     totalCostUsd        number
 *     callCount           number
 *     lastCallAt          ISO string
 *     byEndpoint: {
 *       'gemini-chat':       { calls, inputTokens, outputTokens, costUsd }
 *       'gemini-photo-scan': { ... }
 *       …
 *     }
 *
 *   ai-usage-summary/{YYYY-MM}/
 *     month, totalCalls, totalTokens, totalCostUsd, uniqueUsers
 *     (aggregate roll-up for an admin dashboard / monthly burn rate)
 *
 * Failure mode: tracking is fire-and-forget. If Firestore is unreachable,
 * we log and continue — never block a Gemini response on the tracking
 * write succeeding.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { logApi } from './pawme-logging';
import {
  generateGeminiJson,
  generateGeminiJsonMulti,
  generateGeminiText,
  generateGeminiVisionText,
  type GeminiContext,
  type GeminiFrame,
  type GeminiUsage,
} from './pawme-gemini';

// ──────────────────────────────────────────────────────────────────────
// Pricing snapshot. Values are USD per 1,000,000 tokens.
// Update when Google publishes new tiers. Older calls keep using the
// snapshot that was active at write time — never re-priced retroactively.
// Source: ai.google.dev/gemini-api/docs/pricing (verify before launch).
// ──────────────────────────────────────────────────────────────────────
interface ModelPricing {
  inputPerM: number; // USD per 1M input tokens
  outputPerM: number; // USD per 1M output tokens
}

const PRICING_SNAPSHOT_2026: Record<string, ModelPricing> = {
  // Gemini 2.5 family
  'gemini-2.5-flash': { inputPerM: 0.075, outputPerM: 0.30 },
  'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 5.00 },
  // Aliases / legacy fallbacks pawme-gemini.ts may use
  'gemini-flash-latest': { inputPerM: 0.075, outputPerM: 0.30 },
  'gemini-2.0-flash': { inputPerM: 0.075, outputPerM: 0.30 },
  // Default fallback if the called model isn't in the table — pessimistic
  // (assume the cheapest tier so we don't accidentally over-bill our own
  // dashboards; we'd rather under-count than under-bill the customer).
  '*': { inputPerM: 0.075, outputPerM: 0.30 },
};

function priceFor(model: string): ModelPricing {
  return PRICING_SNAPSHOT_2026[model] ?? PRICING_SNAPSHOT_2026['*'];
}

function calcCostUsd(usage: GeminiUsage, model: string): number {
  const price = priceFor(model);
  const inputUsd = (usage.inputTokens / 1_000_000) * price.inputPerM;
  const outputUsd = (usage.outputTokens / 1_000_000) * price.outputPerM;
  return inputUsd + outputUsd;
}

/**
 * Make a string safe to use as a Firestore map key / field-path segment.
 * Strips the 'mobile/' route prefix and replaces '.', '/', '[', ']', '*', '~'
 * with '-' so e.g. 'mobile/gemini-analyze' -> 'gemini-analyze' and
 * 'gemini-2.5-flash' -> 'gemini-2-5-flash'. Keeps byEndpoint/byModel queryable.
 */
function safeFieldKey(s: string): string {
  return String(s)
    .replace(/^mobile\//, '')
    .replace(/[./[\]*~]/g, '-');
}

function periodKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface RecordUsageInput {
  userId: string | null | undefined;
  endpoint: string;       // e.g. 'gemini-photo-scan'
  model: string;          // model that actually answered
  usage: GeminiUsage | undefined;
  requestId?: string;
}

/**
 * Record one AI call's token usage + cost. Idempotent in the sense that
 * each call writes an increment — duplicate calls will double-count, so
 * call exactly once per Gemini response.
 *
 * Anonymous users (no userId): we still record at the aggregate level
 * so we know how much anonymous-usage costs us.
 */
export async function recordAiUsage(input: RecordUsageInput): Promise<void> {
  const { userId, endpoint, model, usage, requestId } = input;

  if (!usage) {
    // Gemini didn't return usageMetadata — skip. (Logged from caller.)
    return;
  }

  const period = periodKey();
  const costUsd = calcCostUsd(usage, model);

  // Firestore field names used as map keys must not contain '.' or '/', and
  // dotted string keys in set({merge}) are treated as LITERAL names (not paths)
  // — both would break the nested byEndpoint/byModel maps the schema promises.
  // Sanitize: drop the 'mobile/' route prefix and replace path-unsafe chars.
  const epKey = safeFieldKey(endpoint);
  const modelKey = safeFieldKey(model);

  // We could await both writes but we don't want tracking failures to
  // slow the API response. Fire-and-forget via Promise.allSettled.
  const writes: Promise<unknown>[] = [];

  // Per-user doc (only if we know the user)
  if (userId) {
    const userDocRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('aiUsage')
      .doc(period);

    writes.push(
      userDocRef.set(
        {
          month: period,
          totalInputTokens: FieldValue.increment(usage.inputTokens),
          totalOutputTokens: FieldValue.increment(usage.outputTokens),
          totalTokens: FieldValue.increment(usage.totalTokens),
          totalCostUsd: FieldValue.increment(costUsd),
          callCount: FieldValue.increment(1),
          lastCallAt: new Date().toISOString(),
          byEndpoint: {
            [epKey]: {
              calls: FieldValue.increment(1),
              inputTokens: FieldValue.increment(usage.inputTokens),
              outputTokens: FieldValue.increment(usage.outputTokens),
              costUsd: FieldValue.increment(costUsd),
            },
          },
          byModel: {
            [modelKey]: {
              calls: FieldValue.increment(1),
              costUsd: FieldValue.increment(costUsd),
            },
          },
        },
        { merge: true },
      ),
    );
  }

  // Org-wide rollup
  const summaryDocRef = adminDb
    .collection('ai-usage-summary')
    .doc(period);

  writes.push(
    summaryDocRef.set(
      {
        month: period,
        totalCalls: FieldValue.increment(1),
        totalInputTokens: FieldValue.increment(usage.inputTokens),
        totalOutputTokens: FieldValue.increment(usage.outputTokens),
        totalTokens: FieldValue.increment(usage.totalTokens),
        totalCostUsd: FieldValue.increment(costUsd),
        lastCallAt: new Date().toISOString(),
        byEndpoint: {
          [epKey]: {
            calls: FieldValue.increment(1),
            costUsd: FieldValue.increment(costUsd),
          },
        },
        byModel: {
          [modelKey]: {
            calls: FieldValue.increment(1),
            costUsd: FieldValue.increment(costUsd),
          },
        },
      },
      { merge: true },
    ),
  );

  const settled = await Promise.allSettled(writes);
  const failures = settled.filter((s) => s.status === 'rejected');
  if (failures.length > 0) {
    // Don't throw — never let a tracking failure surface to the user.
    logApi('warn', {
      requestId: requestId || 'no-req-id',
      endpoint,
      event: 'ai-usage-track-failed',
      userId: userId || 'anonymous',
      model,
      failures: failures.length,
      reason:
        failures[0].status === 'rejected'
          ? String((failures[0] as PromiseRejectedResult).reason)
          : undefined,
    });
  } else {
    logApi('info', {
      requestId: requestId || 'no-req-id',
      endpoint,
      event: 'ai-usage-tracked',
      userId: userId || 'anonymous',
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: Number(costUsd.toFixed(6)),
    });
  }
}

// ──────────────────────────────────────────────────────────────────────
// Tracked wrappers — call these from /api/mobile/gemini-* routes instead
// of the raw pawme-gemini functions. They forward to the underlying call
// then fire-and-forget `recordAiUsage`. The route file only needs to
// pass in `{ userId, endpoint }`.
// ──────────────────────────────────────────────────────────────────────
export interface TrackingMeta {
  userId: string | null | undefined;
  endpoint: string;
}

export async function trackedGeminiText(
  prompt: string,
  ctx: GeminiContext & TrackingMeta,
) {
  const result = await generateGeminiText(prompt, ctx);
  void recordAiUsage({
    userId: ctx.userId,
    endpoint: ctx.endpoint,
    model: result.modelUsed,
    usage: result.usage,
    requestId: ctx.requestId,
  });
  return result;
}

export async function trackedGeminiVisionText(
  prompt: string,
  imageBase64: string,
  mimeType: string | undefined,
  ctx: GeminiContext & TrackingMeta,
) {
  const result = await generateGeminiVisionText(prompt, imageBase64, mimeType, ctx);
  void recordAiUsage({
    userId: ctx.userId,
    endpoint: ctx.endpoint,
    model: result.modelUsed,
    usage: result.usage,
    requestId: ctx.requestId,
  });
  return result;
}

export async function trackedGeminiJson<T>(
  prompt: string,
  imageBase64: string | undefined,
  mimeType: string | undefined,
  ctx: GeminiContext & TrackingMeta,
) {
  const result = await generateGeminiJson<T>(prompt, imageBase64, mimeType, ctx);
  void recordAiUsage({
    userId: ctx.userId,
    endpoint: ctx.endpoint,
    model: result.modelUsed,
    usage: result.usage,
    requestId: ctx.requestId,
  });
  return result;
}

export async function trackedGeminiJsonMulti<T>(
  prompt: string,
  frames: GeminiFrame[],
  ctx: GeminiContext & TrackingMeta,
) {
  const result = await generateGeminiJsonMulti<T>(prompt, frames, ctx);
  void recordAiUsage({
    userId: ctx.userId,
    endpoint: ctx.endpoint,
    model: result.modelUsed,
    usage: result.usage,
    requestId: ctx.requestId,
  });
  return result;
}

/**
 * Look up an anonymous-or-real user's MTD spend. Useful for soft caps,
 * admin views, or showing "you've used $X this month" UX.
 */
export async function getUserSpendThisMonth(userId: string): Promise<{
  totalCostUsd: number;
  callCount: number;
  month: string;
} | null> {
  try {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('aiUsage')
      .doc(periodKey())
      .get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    return {
      totalCostUsd: (d.totalCostUsd as number) || 0,
      callCount: (d.callCount as number) || 0,
      month: (d.month as string) || periodKey(),
    };
  } catch {
    return null;
  }
}
