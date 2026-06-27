/**
 * GET /api/mobile/shop/redirect?asin=B0017JG41A
 *
 * Affiliate click redirect. The mobile app AND website send every product
 * tap through this endpoint; we look up the product in the catalog, build
 * a monetised outbound link (Skimlinks aggregator, with an Amazon-tag
 * fallback — see affiliate-links.ts), log the click, and 302 the user.
 *
 * Why a proxy instead of putting the URL straight in the client:
 *   1. We can swap affiliate network (Skimlinks → Impact → direct) without
 *      an app update.
 *   2. We get a click log we control, independent of the network.
 *   3. The destination is whitelisted against our catalog, so the proxy
 *      can't be used to launder arbitrary URLs through our domain.
 *
 * Anonymous-allowed. Auth header is optional — if present we attribute
 * the click to the user, otherwise we still log it under "anonymous".
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import { logApi } from '@/lib/pawme-logging';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { CATALOG } from '@/lib/shop-catalog';
import { buildOutboundUrl, destinationFor } from '@/lib/affiliate-links';
import { FieldValue } from 'firebase-admin/firestore';

const ENDPOINT = 'mobile/shop/redirect';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const asin = url.searchParams.get('asin') || '';
  if (!asin) {
    return NextResponse.json({ error: 'asin required' }, { status: 400 });
  }
  // Whitelist against the catalog so the proxy can't be used to launder
  // arbitrary URLs through our domain. Either the ASIN matches a known
  // product or we reject it.
  const product = CATALOG.find((p) => p.asin === asin);
  if (!product) {
    return NextResponse.json({ error: 'unknown product' }, { status: 404 });
  }

  // Stable id for this click — passed to Skimlinks as xcust so their
  // reporting can be reconciled with our own shop-clicks log.
  const clickId = crypto.randomUUID();
  const outbound = buildOutboundUrl(destinationFor(product), clickId);

  // Best-effort user attribution. Failure here just means anonymous click.
  let userId: string | null = null;
  try {
    const { uid } = await requireMobileUser(request);
    userId = uid;
  } catch {
    // ignore
  }

  // Fire-and-forget click log. Independent collection so we can run cost
  // / revenue dashboards without touching pets data.
  const now = new Date().toISOString();
  void (async () => {
    try {
      await adminDb.collection('shop-clicks').doc(clickId).set({
        ts: now,
        clickId,
        asin,
        title: product.title,
        category: product.category,
        destination: outbound,
        userId: userId || null,
        userAgent: request.headers.get('user-agent') || null,
        ip: request.headers.get('x-forwarded-for') || null,
      });
      if (userId) {
        await adminDb
          .collection('users')
          .doc(userId)
          .collection('shopActivity')
          .doc(asin)
          .set(
            {
              asin,
              title: product.title,
              category: product.category,
              clicks: FieldValue.increment(1),
              lastClickAt: now,
            },
            { merge: true },
          );
      }
    } catch (e: any) {
      logApi('warn', {
        requestId: 'no-req-id',
        endpoint: ENDPOINT,
        event: 'shop-click-log-failed',
        error: e?.message,
      });
    }
  })();

  return NextResponse.redirect(outbound, 302);
}
