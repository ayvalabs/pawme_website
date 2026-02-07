import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Register an APNs device token for push notifications.
 *
 * Body:
 *   - userId: string          — Firebase Auth user ID
 *   - token: string           — APNs device token (hex string from iOS)
 *   - platform?: string       — 'ios' (default) or 'android'
 *   - sandbox?: boolean       — true if token is from a debug/TestFlight build
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, token, platform, sandbox } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { success: false, message: 'userId and token are required.' },
        { status: 400 },
      );
    }

    // Validate token format — APNs device tokens are 64-char hex strings
    const cleanToken = token.replace(/[<>\s]/g, '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(cleanToken)) {
      return NextResponse.json(
        { success: false, message: 'Invalid APNs device token format. Expected 64-char hex string.' },
        { status: 400 },
      );
    }

    // Store APNs device token in Firestore under the user's document
    await adminDb.collection('users').doc(userId).set(
      {
        apnsDeviceToken: cleanToken,
        apnsTokenUpdatedAt: new Date().toISOString(),
        apnsSandbox: sandbox ?? false,
        platform: platform || 'ios',
      },
      { merge: true },
    );

    console.log(`[register-push-token] Saved APNs token for user ${userId} (${platform || 'ios'}, sandbox: ${sandbox ?? false})`);

    return NextResponse.json({ success: true, message: 'APNs device token registered.' });
  } catch (error: any) {
    console.error('[register-push-token] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to register push token.' },
      { status: 500 },
    );
  }
}
