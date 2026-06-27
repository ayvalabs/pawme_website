/**
 * GET /api/mobile/promo/validate?code=PAWFRIEND-26
 *
 * Pre-flight check for the mobile redeem screen. Returns the code's discount
 * details so the UI can show "30 days of Pro free 🎉" before the user taps
 * Redeem, plus a flag for which kind of error (so the UI can show the right
 * message).
 *
 * Auth: Firebase ID token (so we can pre-check "already redeemed by you").
 *
 * Returns:
 *   200 { valid: true, code, discount, description, expiresAt, remaining }
 *   200 { valid: false, reason: 'not_found' | 'expired' | 'exhausted' |
 *                                'paused' | 'already_redeemed' }
 *   401 { error: 'unauthorized' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { adminDb } from '@/lib/firebase-admin';
import { logApi, runApi, safePreview } from '@/lib/pawme-logging';
import {
  PromoCode,
  describeDiscount,
  effectiveStatus,
} from '@/lib/promo-types';

const ENDPOINT = 'mobile/promo/validate';

export async function GET(request: NextRequest) {
  const { requestId, result, error } = await runApi(
    { endpoint: ENDPOINT, request },
    async ({ logInfo }) => {
      const { uid } = await requireMobileUser(request);
      const url = new URL(request.url);
      const code = String(url.searchParams.get('code') || '')
        .trim()
        .toUpperCase();

      logInfo({ uid, code: safePreview(code, 64) });

      if (!code || !/^[A-Z0-9-]{3,32}$/.test(code)) {
        return { valid: false, reason: 'not_found' as const };
      }

      const snap = await adminDb.collection('promoCodes').doc(code).get();
      if (!snap.exists) {
        return { valid: false, reason: 'not_found' as const };
      }

      const c = snap.data() as PromoCode;
      const status = effectiveStatus(c);

      if (status === 'paused') {
        return { valid: false, reason: 'paused' as const };
      }
      if (status === 'expired') {
        return { valid: false, reason: 'expired' as const, expiresAt: c.expiresAt };
      }
      if (status === 'exhausted') {
        return { valid: false, reason: 'exhausted' as const };
      }

      // Already redeemed by this user?
      const existing = await adminDb
        .collection('promoRedemptions')
        .where('code', '==', code)
        .where('userId', '==', uid)
        .limit(1)
        .get();
      if (!existing.empty) {
        return { valid: false, reason: 'already_redeemed' as const };
      }

      return {
        valid: true,
        code: c.code,
        discount: c.discount,
        description: describeDiscount(c.discount),
        expiresAt: c.expiresAt,
        remaining:
          c.quantity != null ? Math.max(0, c.quantity - c.redeemedCount) : null,
      };
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
  logApi('info', {
    requestId,
    endpoint: ENDPOINT,
    event: 'validate-result',
    valid: (result as any)?.valid,
    reason: (result as any)?.reason,
  });
  return NextResponse.json(
    { ...(result as object), requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
