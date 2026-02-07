import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  sendAPNsNotifications,
  validateAPNsConfig,
  type APNsNotification,
  type APNsSendResult,
} from '@/lib/apns';

/**
 * Send push notification to a specific user or broadcast to all users via APNs.
 *
 * Body:
 *   - userId?: string        — send to a specific user
 *   - title: string           — notification title
 *   - body: string            — notification body text
 *   - data?: object           — optional data payload (e.g. { screen: 'Pets', petId: '...' })
 *   - badge?: number          — optional badge count
 *   - broadcast?: boolean     — if true, send to all users with push tokens
 *   - sandbox?: boolean       — if true, use APNs sandbox (for TestFlight / dev builds)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate APNs configuration
    const config = validateAPNsConfig();
    if (!config.valid) {
      console.error('[send-notification] Missing APNs config:', config.missing);
      return NextResponse.json(
        { success: false, message: `APNs not configured. Missing: ${config.missing.join(', ')}` },
        { status: 500 },
      );
    }

    const { userId, title, body, data, badge, broadcast, sandbox } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { success: false, message: 'title and body are required.' },
        { status: 400 },
      );
    }

    // Collect device tokens from Firestore
    let tokenRecords: { userId: string; deviceToken: string }[] = [];

    if (broadcast) {
      // Get all users with APNs device tokens
      const snapshot = await adminDb
        .collection('users')
        .where('apnsDeviceToken', '!=', null)
        .get();
      tokenRecords = snapshot.docs
        .map((doc) => ({
          userId: doc.id,
          deviceToken: doc.data().apnsDeviceToken,
        }))
        .filter((r) => !!r.deviceToken);
    } else if (userId) {
      // Get specific user's device token
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      if (userData?.apnsDeviceToken) {
        tokenRecords = [{ userId, deviceToken: userData.apnsDeviceToken }];
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Either userId or broadcast: true is required.' },
        { status: 400 },
      );
    }

    if (tokenRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No device tokens found.',
        sent: 0,
      });
    }

    // Build APNs notification payloads
    const notifications: APNsNotification[] = tokenRecords.map((r) => ({
      deviceToken: r.deviceToken,
      title,
      body,
      badge,
      sound: 'default',
      data: data || undefined,
      pushType: 'alert' as const,
    }));

    // Send via APNs (use sandbox for TestFlight/dev builds)
    const useSandbox = sandbox ?? false;
    const results: APNsSendResult[] = await sendAPNsNotifications(notifications, useSandbox);

    const totalSent = results.filter((r) => r.success).length;
    const errors = results
      .filter((r) => !r.success)
      .map((r) => `${r.deviceToken.substring(0, 8)}...: ${r.reason}`);

    // Clean up invalid tokens (410 Gone = token no longer valid)
    const invalidTokens = results.filter((r) => r.statusCode === 410);
    if (invalidTokens.length > 0) {
      const batch = adminDb.batch();
      for (const invalid of invalidTokens) {
        const matchingRecord = tokenRecords.find((t) => t.deviceToken === invalid.deviceToken);
        if (matchingRecord) {
          batch.update(adminDb.collection('users').doc(matchingRecord.userId), {
            apnsDeviceToken: null,
            apnsTokenInvalidatedAt: new Date().toISOString(),
          });
        }
      }
      await batch.commit();
      console.log(`[send-notification] Cleaned up ${invalidTokens.length} invalid token(s).`);
    }

    // Log notification to Firestore for history
    await adminDb.collection('notifications').add({
      title,
      body,
      data: data || {},
      broadcast: !!broadcast,
      targetUserId: userId || null,
      tokenCount: tokenRecords.length,
      sentCount: totalSent,
      invalidTokensCleaned: invalidTokens.length,
      errors,
      sandbox: useSandbox,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${totalSent} of ${tokenRecords.length} device(s).`,
      sent: totalSent,
      total: tokenRecords.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[send-notification] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to send notification.' },
      { status: 500 },
    );
  }
}
