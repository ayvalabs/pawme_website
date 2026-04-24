import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

/**
 * Validate an Android Play Billing subscription purchase from expo-iap.
 *
 * Mobile client posts:
 *   { userId, platform: 'android', sku, productId, purchaseToken,
 *     packageName?, originalJson?, signature? }
 *
 * Production-grade validation calls the Google Play Developer API:
 *   GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/
 *       {packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}
 *
 * That requires a service account with the `androidpublisher` scope and the
 * app linked in Play Console. The stub below records the purchase token and
 * grants entitlement optimistically — fine for TestFlight/internal tracks,
 * MUST be replaced with a real server-side check before public release.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sku, productId, purchaseToken, packageName } = body;

    if (!userId || !sku || !purchaseToken) {
      return NextResponse.json(
        { success: false, message: 'Missing userId / sku / purchaseToken.' },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ success: false, message: 'Missing auth token.' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.uid !== userId) {
      return NextResponse.json({ success: false, message: 'User mismatch.' }, { status: 403 });
    }

    // TODO: Call Google Play Developer API with a service-account token.
    // For now we accept the client claim.
    const now = Date.now();

    await adminDb.collection('users').doc(userId).set(
      {
        subscription: {
          plan: 'premium',
          status: 'active',
          platform: 'android',
          sku,
          productId: productId || sku,
          purchaseToken,
          packageName: packageName || null,
          // Play Billing uses auto-renew; the webhook (Real-Time Developer
          // Notifications) should update currentPeriodEnd on renewal.
          currentPeriodEnd: null,
          updatedAt: now,
        },
      },
      { merge: true },
    );

    return NextResponse.json({ success: true, message: 'Subscription activated.' });
  } catch (error: any) {
    console.error('[IAP] validate-android error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Validation failed.' },
      { status: 500 },
    );
  }
}
