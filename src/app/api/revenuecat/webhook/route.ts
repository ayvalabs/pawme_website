import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logApi, runApi } from '@/lib/pawme-logging';

/**
 * POST /api/revenuecat/webhook
 *
 * Receives RevenueCat customer events and mirrors entitlement state to
 * Firestore at users/{uid}.subscription so the rest of the stack (mobile
 * gating, AI rate limits, future admin dashboard) has a single source of
 * truth without round-tripping to RevenueCat.
 *
 * RevenueCat's `app_user_id` is the Firebase uid because the mobile app
 * calls Purchases.logIn(user.uid) on auth.
 *
 * Setup
 *   1. RevenueCat dashboard → Project Settings → Integrations → Webhook
 *   2. URL: https://www.ayvalabs.com/api/revenuecat/webhook
 *   3. Authorization header value (shared secret): set REVENUECAT_WEBHOOK_SECRET
 *      in Vercel and paste the same string into the dashboard.
 *
 * Events handled (https://www.revenuecat.com/docs/integrations/webhooks):
 *   INITIAL_PURCHASE, NON_RENEWING_PURCHASE, RENEWAL, PRODUCT_CHANGE,
 *   UNCANCELLATION  → entitlement active
 *   CANCELLATION                                          → still active until expiresAt
 *   EXPIRATION, SUBSCRIPTION_PAUSED                       → entitlement inactive
 *   BILLING_ISSUE                                         → flagged for grace
 *   TRANSFER, SUBSCRIBER_ALIAS                            → ignored (we use Firebase uid)
 *   TEST                                                  → returns 200 noop
 */

const ENDPOINT = 'revenuecat/webhook';

const ACTIVATING_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);

const DEACTIVATING_EVENTS = new Set(['EXPIRATION', 'SUBSCRIPTION_PAUSED']);

interface RcEvent {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  period_type?: string; // NORMAL | TRIAL | INTRO | PROMOTIONAL
  expiration_at_ms?: number | null;
  purchased_at_ms?: number;
  store?: string;
  environment?: string; // SANDBOX | PRODUCTION
  cancel_reason?: string;
  entitlement_ids?: string[];
}

function planFromProductId(productId?: string | null): string {
  if (!productId) return 'pro';
  if (/founder|lifetime/i.test(productId)) return 'pro_lifetime';
  if (/annual|year/i.test(productId)) return 'pro_annual';
  if (/month/i.test(productId)) return 'pro_monthly';
  return 'pro';
}

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<{ ok: true; type: string }>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: rid, logInfo }) => {
      // Auth — RevenueCat sends the configured Authorization header verbatim.
      const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
      const authHeader = request.headers.get('authorization') || '';
      if (expected && authHeader !== expected) {
        const err: Error & { statusCode?: number } = new Error('Unauthorized');
        err.statusCode = 401;
        throw err;
      }

      const body = await request.json().catch(() => ({} as any));
      const event: RcEvent = body?.event ?? {};
      const type = String(event?.type ?? 'UNKNOWN');

      logInfo({
        type,
        env: event.environment,
        productId: event.product_id,
        appUserId: event.app_user_id,
      });

      if (type === 'TEST') {
        return { ok: true as const, type };
      }

      const uid = String(event.app_user_id ?? event.original_app_user_id ?? '');
      if (!uid) {
        const err: Error & { statusCode?: number } = new Error(
          'Missing app_user_id on event',
        );
        err.statusCode = 400;
        throw err;
      }

      const userRef = adminDb.collection('users').doc(uid);

      // Build the subscription patch.
      const productId = event.product_id ?? '';
      const plan = planFromProductId(productId);
      const expiresAtMs =
        typeof event.expiration_at_ms === 'number' ? event.expiration_at_ms : null;
      const expiresAtIso = expiresAtMs ? new Date(expiresAtMs).toISOString() : null;

      let status: 'active' | 'cancelled' | 'expired' | 'billing_issue' | 'paused' = 'active';
      if (DEACTIVATING_EVENTS.has(type)) {
        status = type === 'SUBSCRIPTION_PAUSED' ? 'paused' : 'expired';
      } else if (type === 'CANCELLATION') {
        // Still active until expiresAt — flag the cancel intent.
        status = 'cancelled';
      } else if (type === 'BILLING_ISSUE') {
        status = 'billing_issue';
      } else if (ACTIVATING_EVENTS.has(type)) {
        status = 'active';
      } else {
        // Unknown event type — log and noop.
        logApi('warn', { requestId: rid, endpoint: ENDPOINT, event: 'unknown-type', type });
        return { ok: true as const, type };
      }

      const subscription: Record<string, any> = {
        status,
        plan,
        productId: productId || null,
        source: 'revenuecat',
        environment: event.environment ?? null,
        store: event.store ?? null,
        periodType: event.period_type ?? null,
        lastEventType: type,
        lastEventAt: new Date().toISOString(),
      };
      if (expiresAtIso) subscription.expiresAt = expiresAtIso;

      // For lifetime / non-renewing one-time purchases, keep the doc active and
      // unset expiresAt explicitly so the mobile gate doesn't accidentally
      // expire it.
      if (plan === 'pro_lifetime') {
        subscription.expiresAt = null;
        subscription.status = 'active';
      }

      await userRef.set({ subscription }, { merge: true });

      logApi('info', {
        requestId: rid,
        endpoint: ENDPOINT,
        event: 'updated',
        uid,
        status,
        plan,
        expiresAt: expiresAtIso,
      });

      return { ok: true as const, type };
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Webhook error', requestId },
      { status, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { ok: true, type: result?.type, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}

// RevenueCat may send an HTTP HEAD to verify the URL — accept it.
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
