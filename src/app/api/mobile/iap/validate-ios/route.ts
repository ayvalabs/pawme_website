import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

/**
 * Validate an iOS in-app purchase / subscription receipt from expo-iap (StoreKit 2).
 *
 * Mobile client posts:
 *   { userId, platform: 'ios', sku, productId, transactionId,
 *     jwsRepresentation, purchaseToken? }
 *
 * We verify the JWS, then upsert `users/{uid}.subscription` in Firestore so
 * SubscriptionContext in the mobile app reads `plan: 'premium', status: 'active'`.
 *
 * TODO: Add full JWS signature verification against Apple's public keys
 * (https://developer.apple.com/documentation/appstoreserverapi). The stub
 * below decodes the payload without verifying the signature — safe for
 * internal TestFlight builds but MUST be hardened before public release.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sku, productId, transactionId, jwsRepresentation } = body;

    if (!userId || !sku || !jwsRepresentation) {
      return NextResponse.json(
        { success: false, message: 'Missing userId / sku / jwsRepresentation.' },
        { status: 400 },
      );
    }

    // Require a Firebase ID token so we know the caller owns `userId`.
    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ success: false, message: 'Missing auth token.' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.uid !== userId) {
      return NextResponse.json({ success: false, message: 'User mismatch.' }, { status: 403 });
    }

    // Decode the JWS payload (unverified — see TODO above).
    const payload = decodeJwsPayload(jwsRepresentation);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Could not decode JWS payload.' },
        { status: 400 },
      );
    }

    // StoreKit 2 payload fields we care about:
    //   originalTransactionId, transactionId, productId, expiresDate (ms),
    //   signedDate (ms), type ('Auto-Renewable Subscription')
    const expiresDate: number | undefined = payload.expiresDate;
    const now = Date.now();
    const isActive = !expiresDate || expiresDate > now;

    const planFromSku = sku.includes('yearly') ? 'premium' : 'premium';

    await adminDb.collection('users').doc(userId).set(
      {
        subscription: {
          plan: isActive ? planFromSku : 'free',
          status: isActive ? 'active' : 'expired',
          platform: 'ios',
          sku,
          productId: productId || payload.productId,
          transactionId: transactionId || payload.transactionId,
          originalTransactionId: payload.originalTransactionId,
          currentPeriodEnd: expiresDate || null,
          updatedAt: now,
        },
      },
      { merge: true },
    );

    return NextResponse.json({
      success: isActive,
      message: isActive ? 'Subscription active.' : 'Subscription expired.',
      expiresDate: expiresDate || null,
    });
  } catch (error: any) {
    console.error('[IAP] validate-ios error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Validation failed.' },
      { status: 500 },
    );
  }
}

// Base64URL-decode the middle segment of a JWS token. Signature verification
// is intentionally NOT done here — see the TODO in the top comment.
function decodeJwsPayload(jws: string): any | null {
  try {
    const parts = jws.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
