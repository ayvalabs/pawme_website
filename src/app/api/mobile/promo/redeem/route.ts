/**
 * POST /api/mobile/promo/redeem
 *
 * Body: { code: string, via?: 'deep_link' | 'manual' | 'admin' }
 * Auth: Firebase ID token.
 *
 * Atomically:
 *   1. Re-validates the code (status, expiry, quota, already-redeemed).
 *   2. Calls RevenueCat's Grant Promotional Entitlement API to give the
 *      `pro_access` entitlement for the configured duration.
 *   3. Increments promoCodes/{code}.redeemedCount inside a transaction so
 *      two concurrent redemptions can't both succeed past quota.
 *   4. Writes a promoRedemptions row for analytics + audit.
 *
 * Returns:
 *   200 { success: true, grantedUntil: ISO, description: "30 days free" }
 *   200 { success: false, reason: 'not_found' | 'expired' | 'exhausted' |
 *                                  'paused' | 'already_redeemed' | 'rc_error' }
 *   401 { error: 'unauthorized' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { adminDb } from '@/lib/firebase-admin';
import { logApi, runApi, safePreview } from '@/lib/pawme-logging';
import {
  PromoCode,
  PromoRedemption,
  describeDiscount,
  effectiveStatus,
  grantedUntilFor,
  rcDurationFor,
} from '@/lib/promo-types';

const ENDPOINT = 'mobile/promo/redeem';

/**
 * Set / update a subscriber attribute on RevenueCat (v1 API). Used to tag
 * a redeemer with `kol_code` so the KOL admin refresh route can find them
 * later via RC v2's `filter[attributes.kol_code.value]=...` query.
 *
 * Best-effort: failure is logged but does not affect the redeem result.
 */
async function setRcSubscriberAttribute(
  uid: string,
  key: string,
  value: string,
): Promise<void> {
  const rcKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!rcKey) return;
  const url =
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}/attributes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${rcKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Platform': 'ios',
    },
    body: JSON.stringify({ attributes: { [key]: { value } } }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `RC attribute set failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`,
    );
  }
}

/**
 * Calls RC's Grant Promotional Entitlement API for the given user.
 *
 * Docs: https://www.revenuecat.com/reference/grant-a-promotional-entitlement
 *
 * Returns the response body on success or throws on HTTP errors.
 */
async function grantPromotionalEntitlement(
  uid: string,
  entitlementId: string,
  duration: string,
): Promise<{ grantId: string | null; raw: unknown }> {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) {
    throw new Error('REVENUECAT_SECRET_API_KEY not set');
  }
  const url =
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}/entitlements/` +
    `${encodeURIComponent(entitlementId)}/promotional`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Platform': 'ios', // any value works; RC just needs the header set
    },
    body: JSON.stringify({ duration }),
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg =
      json?.message ||
      json?.detail ||
      json?.code ||
      `RC grant failed: ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return { grantId: json?.event?.id ?? json?.id ?? null, raw: json };
}

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi(
    { endpoint: ENDPOINT, request },
    async ({ requestId, logInfo }) => {
      const { uid } = await requireMobileUser(request);
      const body = await request.json().catch(() => ({}));
      const rawCode = String(body?.code || '')
        .trim()
        .toUpperCase();
      const via: PromoRedemption['via'] =
        body?.via === 'deep_link' || body?.via === 'admin' ? body.via : 'manual';

      logInfo({ uid, code: safePreview(rawCode, 64), via });

      if (!rawCode || !/^[A-Z0-9-]{3,32}$/.test(rawCode)) {
        return { success: false, reason: 'not_found' as const };
      }

      const codeRef = adminDb.collection('promoCodes').doc(rawCode);

      // Phase 1: validate inside a transaction + increment counter
      // (NB: we do NOT call RC inside the transaction — Firestore txns require
      // pure functions. We grant after the txn commits.)
      type TxResult =
        | { ok: false; reason: 'not_found' | 'paused' | 'expired' | 'exhausted' | 'already_redeemed' }
        | { ok: true; code: PromoCode; grantedUntil: string; redemptionRef: string };
      const txResult: TxResult = await adminDb.runTransaction(async (tx): Promise<TxResult> => {
        const snap = await tx.get(codeRef);
        if (!snap.exists) return { ok: false, reason: 'not_found' as const };

        const c = snap.data() as PromoCode;
        const status = effectiveStatus(c);

        if (status === 'paused') return { ok: false, reason: 'paused' as const };
        if (status === 'expired') return { ok: false, reason: 'expired' as const };
        if (status === 'exhausted') return { ok: false, reason: 'exhausted' as const };

        // Detect "already redeemed by this user" — we can't do a query inside
        // a transaction, so we use a deterministic per-user redemption doc id.
        const redemptionDocId = `${c.code}__${uid}`;
        const redemptionRef = adminDb.collection('promoRedemptions').doc(redemptionDocId);
        const existing = await tx.get(redemptionRef);
        if (existing.exists) {
          return { ok: false, reason: 'already_redeemed' as const };
        }

        const grantedUntil = grantedUntilFor(c.discount);
        const next = c.redeemedCount + 1;
        const nextStatus =
          c.quantity != null && next >= c.quantity ? 'exhausted' : c.status;

        tx.update(codeRef, {
          redeemedCount: next,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });

        // Stub the redemption row now so a concurrent retry sees the existence
        // marker. We'll patch the rcGrantId after the RC call below.
        const redemption: PromoRedemption = {
          code: c.code,
          userId: uid,
          redeemedAt: new Date().toISOString(),
          grantedUntil,
          via,
        };
        tx.set(redemptionRef, redemption);

        return {
          ok: true as const,
          code: c,
          grantedUntil,
          redemptionRef: redemptionDocId,
        };
      });

      if (!txResult.ok) {
        return { success: false, reason: txResult.reason };
      }

      // Phase 2: RC grant outside the transaction. If RC fails we roll back
      // by deleting the redemption row + decrementing the counter so the
      // user can retry.
      const code = txResult.code;
      const rcDuration = rcDurationFor(code.discount);
      if (!rcDuration) {
        await rollback(codeRef, txResult.redemptionRef);
        return {
          success: false,
          reason: 'rc_error' as const,
          message: 'Percent-off discounts not yet supported.',
        };
      }

      try {
        const { grantId } = await grantPromotionalEntitlement(
          uid,
          code.discount.entitlementId,
          rcDuration,
        );
        // Patch the redemption row with the RC grant id for auditability.
        await adminDb
          .collection('promoRedemptions')
          .doc(txResult.redemptionRef)
          .update({
            rcGrantId: grantId ?? null,
            inviterUserId: code.inviterUserId ?? null,
          });

        logApi('info', {
          requestId,
          endpoint: ENDPOINT,
          event: 'redeemed',
          code: code.code,
          uid,
          duration: rcDuration,
          grantId: grantId ?? null,
        });

        // KOL attribution. When the redeemed code is linked to a KOL via
        // `kolCode`, do two things — both best-effort:
        //   1. Bump kols/{kolCode}/stats/latest.inAppRedemptions so the
        //      admin dashboard sees the redemption immediately without
        //      waiting on the manual RC refresh.
        //   2. Tag the RC subscriber with `kol_code` so the existing RC v2
        //      refresh route (`/api/admin/kols/[code]/refresh`) can pull
        //      paid conversions + revenue for this user later.
        if (code.kolCode) {
          const kolCode = code.kolCode;
          void (async () => {
            try {
              await adminDb
                .collection('kols')
                .doc(kolCode)
                .collection('stats')
                .doc('latest')
                .set(
                  {
                    inAppRedemptions: FieldValue.increment(1),
                    refreshedAt: new Date().toISOString(),
                  },
                  { merge: true },
                );
            } catch (e: unknown) {
              logApi('warn', {
                requestId,
                endpoint: ENDPOINT,
                event: 'kol-stats-bump-failed',
                kolCode,
                error: e instanceof Error ? e.message : String(e),
              });
            }
            try {
              await setRcSubscriberAttribute(uid, 'kol_code', kolCode);
            } catch (e: unknown) {
              logApi('warn', {
                requestId,
                endpoint: ENDPOINT,
                event: 'rc-attribute-set-failed',
                kolCode,
                uid,
                error: e instanceof Error ? e.message : String(e),
              });
            }
          })();
        }

        // If this code belongs to a user (invite code), reward the inviter
        // with the configured `inviterReward` (or fall back to the same
        // discount the invitee got). Skip if redeemer == inviter to prevent
        // self-rewarding.
        if (code.inviterUserId && code.inviterUserId !== uid) {
          const reward = code.inviterReward ?? code.discount;
          const rewardDuration = rcDurationFor(reward);
          if (rewardDuration) {
            try {
              await grantPromotionalEntitlement(
                code.inviterUserId,
                reward.entitlementId,
                rewardDuration,
              );
              logApi('info', {
                requestId,
                endpoint: ENDPOINT,
                event: 'inviter-rewarded',
                code: code.code,
                inviterUid: code.inviterUserId,
                inviteeUid: uid,
                duration: rewardDuration,
              });
            } catch (inviterErr) {
              // Inviter reward failure is non-fatal — the invitee already
              // got Pro and shouldn't be penalised. Log + move on.
              const message =
                inviterErr instanceof Error ? inviterErr.message : String(inviterErr);
              logApi('warn', {
                requestId,
                endpoint: ENDPOINT,
                event: 'inviter-reward-failed',
                code: code.code,
                inviterUid: code.inviterUserId,
                error: safePreview(message, 400),
              });
            }
          }
        }

        return {
          success: true,
          grantedUntil: txResult.grantedUntil,
          description: describeDiscount(code.discount),
          code: code.code,
          inviterRewarded: Boolean(code.inviterUserId && code.inviterUserId !== uid),
        };
      } catch (rcErr) {
        const message = rcErr instanceof Error ? rcErr.message : String(rcErr);
        logApi('error', {
          requestId,
          endpoint: ENDPOINT,
          event: 'rc-grant-failed',
          code: code.code,
          uid,
          error: safePreview(message, 600),
        });
        await rollback(codeRef, txResult.redemptionRef);
        return { success: false, reason: 'rc_error' as const, message };
      }
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      { error: (error as Error)?.message || 'internal error', requestId },
      { status, headers: { 'x-request-id': requestId } },
    );
  }
  return NextResponse.json(
    { ...(result as object), requestId },
    { headers: { 'x-request-id': requestId } },
  );
}

async function rollback(
  codeRef: FirebaseFirestore.DocumentReference,
  redemptionDocId: string,
) {
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(codeRef);
      if (!snap.exists) return;
      const c = snap.data() as PromoCode;
      tx.update(codeRef, {
        redeemedCount: Math.max(0, c.redeemedCount - 1),
        // Re-open if we'd flagged it exhausted on the way out.
        status:
          c.status === 'exhausted' &&
          c.quantity != null &&
          c.redeemedCount - 1 < c.quantity
            ? 'active'
            : c.status,
        updatedAt: new Date().toISOString(),
      });
      tx.delete(adminDb.collection('promoRedemptions').doc(redemptionDocId));
    });
  } catch {
    // best-effort rollback; if it fails we live with a stuck redemption row
  }
}
