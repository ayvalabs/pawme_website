import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logApi, runApi } from '@/lib/pawme-logging';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/mobile/referral-redeem
 *
 * Body: { code: string }
 * Auth: Bearer Firebase ID token (the *new* user redeeming the code).
 *
 * On success:
 *   - Both new user and referrer get 30 days of Pro added to
 *     users/{uid}.subscription (status='active', plan='pro_referral',
 *     expiresAt = max(existing, now+30d)).
 *   - Referrer's referralCount and referralBonusDays are incremented.
 *   - users/{newUserId}.referredBy is set so this can't be applied twice.
 *
 * Anti-fraud:
 *   - Code → uid lookup is via referralCodes/{code} (created when the
 *     referrer's code was allocated). If the doc doesn't exist, code is
 *     invalid.
 *   - Self-referrals are rejected.
 *   - users/{newUserId}.referredBy presence blocks repeat redemptions.
 */

const ENDPOINT = 'mobile/referral-redeem';
const BONUS_DAYS = 30;

export async function POST(request: NextRequest) {
  const { requestId, result, error } = await runApi<{
    success: true;
    bonusDaysGranted: number;
    message: string;
  }>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: rid, logInfo }) => {
      const { uid: newUserId } = await requireMobileUser(request);
      logInfo({ uid: newUserId });

      const body = await request.json().catch(() => ({}));
      const rawCode = String(body?.code ?? '')
        .trim()
        .toUpperCase();
      if (!rawCode) {
        const err: Error & { statusCode?: number } = new Error('code is required');
        err.statusCode = 400;
        throw err;
      }

      // Look up referrer by code.
      const codeDoc = await adminDb.collection('referralCodes').doc(rawCode).get();
      if (!codeDoc.exists) {
        const err: Error & { statusCode?: number } = new Error('Invalid referral code.');
        err.statusCode = 404;
        throw err;
      }
      const referrerUid = String((codeDoc.data() as any)?.uid ?? '');
      if (!referrerUid) {
        const err: Error & { statusCode?: number } = new Error('Invalid referral code.');
        err.statusCode = 404;
        throw err;
      }
      if (referrerUid === newUserId) {
        const err: Error & { statusCode?: number } = new Error("You can't refer yourself.");
        err.statusCode = 400;
        throw err;
      }

      const newUserRef = adminDb.collection('users').doc(newUserId);
      const referrerRef = adminDb.collection('users').doc(referrerUid);

      const now = Date.now();
      const grantMs = BONUS_DAYS * 24 * 60 * 60 * 1000;

      let bonusGranted = BONUS_DAYS;

      await adminDb.runTransaction(async (tx) => {
        const [newUserSnap, referrerSnap] = await Promise.all([
          tx.get(newUserRef),
          tx.get(referrerRef),
        ]);

        const newUserData = (newUserSnap.data() ?? {}) as Record<string, any>;

        if (newUserData.referredBy) {
          // Already redeemed — surface a friendly error.
          const err: Error & { statusCode?: number } = new Error(
            'You have already redeemed a referral code.',
          );
          err.statusCode = 409;
          throw err;
        }

        // Compute new expiresAt for both users.
        const computeNewExpiry = (existing: any): number => {
          const cur =
            typeof existing === 'string'
              ? Date.parse(existing) || 0
              : Number(existing) || 0;
          const base = Math.max(cur, now);
          return base + grantMs;
        };

        const newExpiryNew = computeNewExpiry(newUserData?.subscription?.expiresAt);
        const newExpiryReferrer = computeNewExpiry(
          (referrerSnap.data() ?? {})?.subscription?.expiresAt,
        );

        tx.set(
          newUserRef,
          {
            referredBy: referrerUid,
            referralRedeemedAt: new Date(now).toISOString(),
            subscription: {
              status: 'active',
              plan: 'pro_referral',
              source: 'referral',
              expiresAt: new Date(newExpiryNew).toISOString(),
            },
          },
          { merge: true },
        );

        tx.set(
          referrerRef,
          {
            referralCount: FieldValue.increment(1),
            referralBonusDays: FieldValue.increment(BONUS_DAYS),
            subscription: {
              status: 'active',
              plan: 'pro_referral',
              source: 'referral',
              expiresAt: new Date(newExpiryReferrer).toISOString(),
            },
          },
          { merge: true },
        );
      });

      logApi('info', {
        requestId: rid,
        endpoint: ENDPOINT,
        event: 'redeemed',
        referrerUid,
        newUserId,
        bonusGranted,
      });

      return {
        success: true as const,
        bonusDaysGranted: bonusGranted,
        message: `30 days Pro unlocked — both you and your friend.`,
      };
    },
  );

  if (error) {
    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Could not redeem code.',
        requestId,
      },
      { status, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { ...result, requestId },
    { headers: { 'x-request-id': requestId } },
  );
}
