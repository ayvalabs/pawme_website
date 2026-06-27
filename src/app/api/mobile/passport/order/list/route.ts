import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireMobileUser } from '@/lib/pawme-mobile';

/**
 * GET /api/mobile/passport/order/list
 *
 * Returns the calling user's printed-passport orders, most-recent first.
 * Powers the "My Orders" view in the app.
 */

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireMobileUser(request);

    const snap = await adminDb
      .collection('passportOrders')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const orders = snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        orderId: x.orderId,
        petId: x.petId,
        petName: x.petName ?? null,
        status: x.status,
        amountCents: x.amountCents,
        currency: x.currency,
        createdAt: x.createdAt,
        shippedAt: x.shippedAt ?? null,
        trackingNumber: x.trackingNumber ?? null,
      };
    });

    return NextResponse.json({ success: true, orders });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err?.statusCode ?? 500;
    console.error('[passport/order/list] failed', err);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Could not list orders.' },
      { status },
    );
  }
}
