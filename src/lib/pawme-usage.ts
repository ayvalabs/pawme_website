/**
 * Server-side AI usage limits for PawPilot mobile.
 *
 * Why server-side: the client (`pawpilot_app/src/services/usageLimits.ts`) keeps
 * counters in AsyncStorage so the UI can show "remaining" without a network round
 * trip. But that's bypassable — reinstall the app and the counter resets.
 *
 * This module is the source of truth. Every Gemini route calls
 * `assertWithinUsageLimit` after auth and before invoking Gemini. If the user
 * is over the cap, we throw a 402 Payment Required and the route returns it to
 * the app, which navigates to the paywall.
 *
 * Counters live at:
 *   users/{uid}/usage/{period}
 * where period is "YYYY-MM-DD" for daily categories and "YYYY-MM" for monthly.
 *
 * Pro users (subscription.status === 'active') still hit the soft Pro caps so
 * a single farmed account can't drain the Gemini budget.
 */
import { adminDb } from '@/lib/firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export type UsageCategory =
  | 'chat'
  | 'symptom'
  | 'photoScan'
  | 'training'
  | 'nutrition'
  | 'trackerExtract'
  | 'recordExtract';

const PERIOD: Record<UsageCategory, 'day' | 'month'> = {
  chat: 'day',
  symptom: 'month',
  photoScan: 'month',
  training: 'month',
  nutrition: 'month',
  trackerExtract: 'month',
  recordExtract: 'month',
};

/**
 * Free-tier limits. Tightened from the v1 generosity to match the cost
 * profile of each category (vision >> text).
 */
const FREE_LIMITS: Record<UsageCategory, number> = {
  chat: 10,          // text only — cheap; daily habit hook
  symptom: 1,        // vision — one taste per month
  photoScan: 1,      // vision — one taste per month
  training: 1,       // text — one taste per month
  nutrition: 1,      // text — one taste per month
  trackerExtract: 5, // vision — utility feature, slightly more generous
  recordExtract: 5,  // vision — utility feature, slightly more generous
};

/**
 * Soft Pro caps. A normal Pro user will never hit these. Their purpose is to
 * protect against scripted abuse on a single account, not to gate real users.
 * If you ever see a real user complaining they hit one of these, raise it.
 */
const PRO_LIMITS: Record<UsageCategory, number> = {
  chat: 200,          // per day
  symptom: 30,        // per month
  photoScan: 30,      // per month
  training: 30,       // per month
  nutrition: 30,      // per month
  trackerExtract: 60, // per month
  recordExtract: 60,  // per month
};

function periodKey(category: UsageCategory, now = new Date()): string {
  if (PERIOD[category] === 'day') {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
      now.getUTCDate(),
    ).padStart(2, '0')}`;
  }
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function usageDocRef(db: Firestore, uid: string, category: UsageCategory) {
  return db
    .collection('users')
    .doc(uid)
    .collection('usage')
    .doc(`${category}_${periodKey(category)}`);
}

/**
 * Cheap subscription check. Reads users/{uid}.subscription.status which the
 * RevenueCat webhook keeps in sync. Returns true if the user is currently Pro.
 */
async function isProUser(uid: string): Promise<boolean> {
  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    if (!snap.exists) return false;
    const data = snap.data() as Record<string, unknown> | undefined;
    const sub = (data?.subscription as Record<string, unknown> | undefined) || undefined;
    if (!sub) return false;
    return sub.status === 'active';
  } catch {
    return false;
  }
}

export interface UsageReadout {
  category: UsageCategory;
  used: number;
  limit: number;
  remaining: number;
  isPro: boolean;
  period: 'day' | 'month';
  periodKey: string;
}

export async function getUsage(
  uid: string,
  category: UsageCategory,
): Promise<UsageReadout> {
  const isPro = await isProUser(uid);
  const limit = isPro ? PRO_LIMITS[category] : FREE_LIMITS[category];
  const ref = usageDocRef(adminDb, uid, category);
  const snap = await ref.get();
  const used = snap.exists ? Number((snap.data() as { count?: number })?.count ?? 0) : 0;
  return {
    category,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    isPro,
    period: PERIOD[category],
    periodKey: periodKey(category),
  };
}

/**
 * Atomically increments the counter and returns the post-bump readout.
 * Uses a transaction so two concurrent requests can't both squeak past
 * the limit by reading-before-writing.
 */
export async function bumpUsage(
  uid: string,
  category: UsageCategory,
): Promise<UsageReadout> {
  const isPro = await isProUser(uid);
  const limit = isPro ? PRO_LIMITS[category] : FREE_LIMITS[category];
  const ref = usageDocRef(adminDb, uid, category);

  const after = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? Number((snap.data() as { count?: number })?.count ?? 0) : 0;
    const next = prev + 1;
    tx.set(
      ref,
      {
        count: next,
        category,
        period: PERIOD[category],
        periodKey: periodKey(category),
        lastBumpedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return next;
  });

  return {
    category,
    used: after,
    limit,
    remaining: Math.max(0, limit - after),
    isPro,
    period: PERIOD[category],
    periodKey: periodKey(category),
  };
}

export class UsageLimitError extends Error {
  statusCode = 402;
  category: UsageCategory;
  used: number;
  limit: number;
  isPro: boolean;
  constructor(readout: UsageReadout) {
    const tier = readout.isPro ? 'Pro' : 'free';
    super(
      readout.isPro
        ? `Pro soft cap reached for ${readout.category} (${readout.used}/${readout.limit} this ${readout.period}). Try again next ${readout.period} or contact support.`
        : `${readout.category} free limit reached (${readout.used}/${readout.limit} this ${readout.period}). Upgrade to PawPilot Pro for unlimited use.`,
    );
    void tier;
    this.category = readout.category;
    this.used = readout.used;
    this.limit = readout.limit;
    this.isPro = readout.isPro;
  }
}

/**
 * Asserts the user is allowed one more call in this category, then bumps the
 * counter. Throws UsageLimitError if over the cap (the route should map this
 * to a 402 response so the app can navigate to the paywall).
 */
export async function assertAndBumpUsage(
  uid: string,
  category: UsageCategory,
): Promise<UsageReadout> {
  const before = await getUsage(uid, category);
  if (before.used >= before.limit) {
    throw new UsageLimitError(before);
  }
  return await bumpUsage(uid, category);
}

export const USAGE_LIMITS = { FREE_LIMITS, PRO_LIMITS, PERIOD };
