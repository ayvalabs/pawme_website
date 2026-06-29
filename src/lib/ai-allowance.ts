/**
 * Free-tier AI metering — per PRD-ai-cost-metering.md §3.
 *
 * Non-Pro users get a monthly allowance of AI calls (pooled across all
 * Gemini-backed routes). Hit the cap → endpoint throws a structured 402
 * → app routes to PaywallScreen.
 *
 * Pro users: no metering (anti-abuse cap could be added later — see PRD §3
 * "Hard rate-limit ceiling even for Pro").
 *
 * The counter doc that this reads is the same one pawme-cost-tracking.ts
 * `recordAiUsage` writes — `users/{uid}/aiUsage/{YYYY-MM}.callCount`. No
 * separate counter, no read-modify-write race.
 */

import { adminDb } from './firebase-admin';

const MONTHLY_FREE_ALLOWANCE = Number(process.env.AI_FREE_ALLOWANCE_PER_MONTH) || 25;

function periodKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface AllowanceCheckResult {
  isPro: boolean;
  used: number;
  allowance: number;
  remaining: number;
  withinLimit: boolean;
}

export async function getAllowanceState(uid: string | null | undefined): Promise<AllowanceCheckResult> {
  const allowance = MONTHLY_FREE_ALLOWANCE;
  if (!uid) {
    return { isPro: false, used: 0, allowance, remaining: allowance, withinLimit: true };
  }

  // Read in parallel — single doc each, both O(1).
  const [userSnap, usageSnap] = await Promise.all([
    adminDb.collection('users').doc(uid).get(),
    adminDb.collection('users').doc(uid).collection('aiUsage').doc(periodKey()).get(),
  ]);

  const isPro = (userSnap.data() as { isPro?: boolean } | undefined)?.isPro === true;
  const used = (usageSnap.data() as { callCount?: number } | undefined)?.callCount ?? 0;
  const remaining = Math.max(0, allowance - used);
  const withinLimit = isPro || used < allowance;
  return { isPro, used, allowance, remaining, withinLimit };
}

/**
 * Throws a 402 error with a structured body when the user is non-Pro and
 * has used their monthly allowance. The app's fetch wrapper should treat
 * a 402 with `{ reason: 'free_limit_reached' }` as a PaywallScreen trigger.
 *
 * Anonymous users (no uid) are always allowed through — they're metered
 * at the aggregate level in pawme-cost-tracking but don't have an account
 * to gate. Reconsider if anon-abuse becomes a problem.
 */
export async function requireWithinFreeTier(uid: string | null | undefined, feature: string): Promise<void> {
  const state = await getAllowanceState(uid);
  if (state.withinLimit) return;
  const err = new Error('AI free-tier allowance reached for this month.') as Error & {
    statusCode?: number;
    code?: string;
    payload?: Record<string, unknown>;
  };
  err.statusCode = 402;
  err.code = 'free_limit_reached';
  err.payload = {
    reason: 'free_limit_reached',
    feature,
    used: state.used,
    allowance: state.allowance,
    remaining: 0,
  };
  throw err;
}
