/**
 * POST /api/mobile/shop/remind   { "productId": "<asin>" }
 *
 * Records that someone wants to be reminded when an out-of-stock product
 * becomes available. Used by the "Remind me" button on web + app. Stores a
 * global interest counter per product (for demand signal) and, if the
 * caller is authed, a per-user reminder so we can notify them later.
 *
 * Anonymous-allowed: auth header is optional.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  let productId: unknown;
  try {
    const body = await request.json();
    productId = body?.productId;
  } catch {
    // no/invalid body
  }
  if (!productId || typeof productId !== 'string') {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const { uid } = await requireMobileUser(request);
    userId = uid;
  } catch {
    // anonymous — still count the interest
  }

  const now = new Date().toISOString();
  try {
    // Global demand counter per product.
    await adminDb
      .collection('shop-reminders')
      .doc(productId)
      .set(
        { productId, count: FieldValue.increment(1), lastAt: now },
        { merge: true },
      );
    // Per-user reminder so we can notify when it's back in stock.
    if (userId) {
      await adminDb
        .collection('users')
        .doc(userId)
        .collection('shopReminders')
        .doc(productId)
        .set({ productId, requestedAt: now }, { merge: true });
    }
  } catch {
    // best-effort logging only — never fail the user's tap
  }

  return NextResponse.json({ ok: true });
}
