import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { requireMobileUser } from '@/lib/pawme-mobile';
import { priceForAddress } from '@/lib/passport-pricing';

/**
 * POST /api/mobile/passport/order/create
 *
 * Creates a Stripe PaymentIntent for a printed-passport order and persists a
 * pending order doc. The mobile app drives Stripe's Payment Sheet with the
 * returned clientSecret — that surface natively handles Apple Pay / Google Pay
 * (via `automatic_payment_methods`) so we don't need separate buttons.
 *
 * Fulfillment happens in the Stripe webhook on `payment_intent.succeeded`
 * (matches `metadata.type === 'printed_passport'`).
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
  country: string;   // ISO-3166-1 alpha-2
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
    name,
    line1,
    line2: str(r.line2, 200),
    city,
    state: str(r.state, 100),
    postalCode,
    country,
    phone: str(r.phone, 32),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireMobileUser(request);
    const body = await request.json().catch(() => ({}));

    const petId = str(body?.petId, 64);
    if (!petId) {
      return NextResponse.json({ success: false, message: 'petId is required.' }, { status: 400 });
    }

    const address = parseAddress(body?.shippingAddress);
    if (!address) {
      return NextResponse.json(
        { success: false, message: 'shippingAddress is required (name, line1, city, postalCode, country).' },
        { status: 400 },
      );
    }

    // Ownership check: the pet must belong to the calling user.
    const petSnap = await adminDb.collection('pets').doc(petId).get();
    if (!petSnap.exists || (petSnap.data() as { userId?: string })?.userId !== uid) {
      return NextResponse.json({ success: false, message: 'Pet not found.' }, { status: 404 });
    }
    const pet = petSnap.data() as Record<string, unknown>;

    const price = priceForAddress(address.country);

    // Pre-create the order doc so we can reference it from the PaymentIntent
    // metadata (the webhook uses orderId to update the right doc).
    const orderRef = adminDb.collection('passportOrders').doc();
    const orderId = orderRef.id;

    const intent = await stripe.paymentIntents.create({
      amount: price.amount,
      currency: price.currency,
      // Apple Pay / Google Pay come through Payment Sheet via this flag.
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'printed_passport',
        orderId,
        uid,
        petId,
        petName: str(pet.name, 60) ?? 'Pet',
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
      petId,
      petName: str(pet.name, 60) ?? null,
      address,
      amountCents: price.amount,
      baseCents: price.baseCents,
      shippingCents: price.shippingCents,
      currency: price.currency,
      status: 'pending_payment',
      paymentIntentId: intent.id,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentIntentClientSecret: intent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: price.amount,
      currency: price.currency,
      breakdown: { baseCents: price.baseCents, shippingCents: price.shippingCents },
    });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const status = err?.statusCode ?? 500;
    console.error('[passport/order/create] failed', err);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Could not create order.' },
      { status },
    );
  }
}
