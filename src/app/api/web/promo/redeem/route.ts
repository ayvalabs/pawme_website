/**
 * POST /api/web/promo/redeem
 *
 * Web equivalent of /api/mobile/promo/redeem. Different auth surface
 * (session cookie instead of Authorization: Bearer) but identical
 * semantics: validate the code, grant the RC entitlement, write the
 * promoRedemptions row.
 *
 * Body: { code: string }
 * Returns:
 *   200 { success: true, grantedUntil: ISO, description: string }
 *   200 { success: false, reason: 'not_found' | 'expired' | 'exhausted' |
 *                                  'paused' | 'already_redeemed' | 'rc_error' }
 *   401 { error: 'unauthorized' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { currentWebUser } from '@/lib/pawme-auth-web';
import { adminDb } from '@/lib/firebase-admin';
import { logApi, runApi } from '@/lib/pawme-logging';
import { grantProEntitlement } from '@/lib/pawme-rc';
import {
  PromoCode,
  PromoRedemption,
  describeDiscount,
  effectiveStatus,
  grantedUntilFor,
  rcDurationFor,
} from '@/lib/promo-types';

const ENDPOINT = 'web/promo/redeem';

interface Outcome {
  success: boolean;
  reason?: string;
  grantedUntil?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<Outcome>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: reqId, logInfo }): Promise<Outcome> => {
      const user = await currentWebUser();
      if (!user) {
        return { success: false, reason: 'unauthorized' };
      }
      const body = await request.json().catch(() => ({}));
      const code = String(body?.code || '').trim().toUpperCase();
      if (!code) return { success: false, reason: 'not_found' };

      const codeRef = adminDb.collection('promoCodes').doc(code);

      // Re-run validation + atomic redemption inside a transaction so
      // concurrent redemptions can't exceed quota.
      const outcome: Outcome = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(codeRef);
        if (!snap.exists) return { success: false, reason: 'not_found' };
        const data = snap.data() as PromoCode;

        const eff = effectiveStatus(data);
        if (eff !== 'active') return { success: false, reason: eff };

        // Has this user already redeemed THIS code? (one-per-user policy
        // for non-unlimited codes; for unlimited codes we still allow it
        // since users might "re-redeem" to refresh entitlement.)
        const dupSnap = await adminDb
          .collection('promoRedemptions')
          .where('code', '==', code)
          .where('userId', '==', user.uid)
          .limit(1)
          .get();
        if (!dupSnap.empty && data.quantity != null) {
          return { success: false, reason: 'already_redeemed' };
        }

        const duration = rcDurationFor(data.discount);
        if (!duration) return { success: false, reason: 'rc_error' };

        // Grant the entitlement.
        const grant = await grantProEntitlement(
          user.uid,
          duration,
          `promo_${code}`,
        );
        if (!grant.ok) {
          logApi('warn', {
            requestId: reqId,
            endpoint: ENDPOINT,
            event: 'rc-grant-failed',
            code,
            uid: user.uid,
            error: grant.error,
          });
          return { success: false, reason: 'rc_error' };
        }

        // Increment redeemedCount + flip to "exhausted" if we just hit
        // the cap.
        const newCount = (data.redeemedCount || 0) + 1;
        const updates: Partial<PromoCode> & Record<string, unknown> = {
          redeemedCount: FieldValue.increment(1) as unknown as number,
          updatedAt: new Date().toISOString(),
        };
        if (data.quantity != null && newCount >= data.quantity) {
          updates.status = 'exhausted';
        }
        tx.set(codeRef, updates, { merge: true });

        // Audit log.
        const redemption: PromoRedemption = {
          code,
          userId: user.uid,
          userEmail: user.email || undefined,
          redeemedAt: new Date().toISOString(),
          grantedUntil: grantedUntilFor(data.discount),
          via: 'manual',
          rcGrantId: grant.rcGrantId,
        };
        tx.create(adminDb.collection('promoRedemptions').doc(), redemption);

        return {
          success: true,
          grantedUntil: redemption.grantedUntil,
          description: describeDiscount(data.discount),
        };
      });

      logInfo({ code, success: outcome.success, reason: outcome.reason });
      return outcome;
    },
  );

  if (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error), requestId },
      { status: 500 },
    );
  }
  if (result?.reason === 'unauthorized') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json(result);
}
