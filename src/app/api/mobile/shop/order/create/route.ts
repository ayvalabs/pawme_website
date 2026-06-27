import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { priceForAddress } from '@/lib/passport-pricing';

/**
 * POST /api/mobile/shop/order/create
 *
 * Creates a Stripe PaymentIntent for a first-party physical-goods purchase
 * from the Shop. Product schema: `shop-products/{id}` with
 * fulfillmentType='physical' + priceCents + (optional) stockUnits + inStock.
 *
 * App drives the Stripe Payment Sheet with the returned clientSecret —
 * Apple Pay / Google Pay work via automatic_payment_methods.
 *
 * Fulfillment dispatch happens in the Stripe webhook (metadata.type ===
 * 'shop_physical') — TODO swap manual-fulfillment placeholder for a
 * 3PL/print/fulfillment provider once chosen.
 */

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

function str(v: unknown, max = 120): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.slice(0, max);
}

function parseAddress(raw: unknown): Address | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name, 100);
  const line1 = str(r.line1, 200);
  const city = str(r.city, 100);
  const postalCode = str(r.postalCode, 20);
  const country = str(r.country, 2)?.toUpperCase();
  if (!name || !line1 || !city || !postalCode || !country) return null;
  return {
    name, line1,
    line2: str(r.line2, 200), city,
    state: str(r.state, 100),
    postalCode, country,
    phone: str(r.phone, 32),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireMobileUser(request);
    const body = await request.json().catch(() => ({}));

    const productId = str(body?.productId, 64);
    const quantity = Math.max(1, Math.min(10, Number(body?.quantity) || 1));
    if (!productId) {
      return NextResponse.json({ success: false, message: 'productId is required.' }, { status: 400 });
    }

    const address = parseAddress(body?.shippingAddress);
    if (!address) {
      return NextResponse.json(
        { success: false, message: 'shippingAddress is required (name, line1, city, postalCode, country).' },
        { status: 400 },
      );
    }

    // Load product from Firestore — collection name matches the existing
    // shop-firestore.ts reader.
    const prodSnap = await adminDb.collection('shop-products').doc(productId).get();
    if (!prodSnap.exists) {
      return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });
    }
    const prod = prodSnap.data() as Record<string, unknown>;

    if (prod.fulfillmentType !== 'physical') {
      return NextResponse.json(
        { success: false, message: 'This product is not available for direct checkout (affiliate-only).' },
        { status: 400 },
      );
    }
    const priceCents = typeof prod.priceCents === 'number' ? prod.priceCents : 0;
    if (priceCents <= 0) {
      return NextResponse.json({ success: false, message: 'Product has no price set.' }, { status: 400 });
    }
    if (prod.inStock === false) {
      return NextResponse.json({ success: false, message: 'Product is out of stock.' }, { status: 409 });
    }
    if (typeof prod.stockUnits === 'number' && prod.stockUnits < quantity) {
      return NextResponse.json(
        { success: false, message: `Only ${prod.stockUnits} units available.` },
        { status: 409 },
      );
    }

    const currency = (typeof prod.currency === 'string' ? prod.currency : 'usd').toLowerCase();
    const shipping = priceForAddress(address.country); // reuse country-band shipping
    const subtotalCents = priceCents * quantity;
    const totalCents = subtotalCents + shipping.shippingCents;

    const orderRef = adminDb.collection('shopOrders').doc();
    const orderId = orderRef.id;

    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'shop_physical',
        orderId,
        uid,
        productId,
        productTitle: str(prod.title, 100) ?? '',
        quantity: String(quantity),
      },
      shipping: {
        name: address.name,
        phone: address.phone,
        address: {
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postal_code: address.postalCode,
          country: address.country,
        },
      },
    });

    await orderRef.set({
      orderId,
      uid,
      productId,
      productTitle: str(prod.title, 100) ?? null,
      quantity,
      unitPriceCents: priceCents,
      subtotalCents,
      shippingCents: shipping.shippingCents,
      totalCents,
      currency,
      address,
      status: 'pending_payment',
      paymentIntentId: intent.id,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentIntentClientSecret: intent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: totalCents,
      currency,
      breakdown: { unitPriceCents: priceCents, quantity, subtotalCents, shippingCents: shipping.shippingCents },
    });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err?.statusCode ?? 500;
    console.error('[shop/order/create] failed', err);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Could not create shop order.' },
      { status },
    );
  }
}
