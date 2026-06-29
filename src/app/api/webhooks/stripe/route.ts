import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendVipDepositReceiptEmail } from '@/app/actions/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  console.log('🔵 Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.type === 'vip_deposit' && session.payment_status === 'paid') {
          const userId = session.metadata.userId;
          const userName = session.metadata.userName;
          const userEmail = session.customer_email;

          console.log('✅ VIP payment completed for user:', userId);

          // Update user VIP status in Firestore
          await adminDb.collection('users').doc(userId).update({
            isVip: true,
            vipPaidAt: new Date(),
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
          });

          // Sync VIP status to Brevo
          if (userEmail) {
            try {
              const { syncContactToBrevo } = await import('@/lib/brevo');
              const userDoc = await adminDb.collection('users').doc(userId).get();
              await syncContactToBrevo({
                email: userEmail,
                name: userName || 'VIP Member',
                isVip: true,
                signupDate: userDoc.data()?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                source: 'pawme-website',
              });
              console.log('✅ VIP status synced to Brevo');
            } catch (brevoErr) {
              console.error('⚠️ Brevo sync failed:', brevoErr);
            }
          }

          // Send VIP receipt email
          if (userEmail) {
            await sendVipDepositReceiptEmail({
              to: userEmail,
              name: userName,
              amount: '$1.00',
            });
          }

          console.log('✅ User VIP status updated and email sent');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('✅ Payment succeeded:', paymentIntent.id);

        // Shop physical-goods order (first-party direct sale via Stripe).
        // Pre-created at PaymentIntent creation; orderId on metadata.
        if (paymentIntent.metadata?.type === 'shop_physical') {
          const orderId = paymentIntent.metadata.orderId;
          if (orderId) {
            await adminDb.collection('shopOrders').doc(orderId).update({
              status: 'paid',
              paidAt: new Date().toISOString(),
              stripeChargeId: paymentIntent.latest_charge ?? null,
            });
            console.log('✅ Shop order marked paid:', orderId);
            // TODO: decrement shop-products/{productId}.stockUnits and
            // dispatch to 3PL once a fulfillment provider is chosen.
          }
        }

        // QR collar tag (Phase 4). Order pre-created at PaymentIntent
        // creation time; orderId is on metadata.
        if (paymentIntent.metadata?.type === 'qr_collar_tag') {
          const orderId = paymentIntent.metadata.orderId;
          if (orderId) {
            await adminDb.collection('tagOrders').doc(orderId).update({
              status: 'paid',
              paidAt: new Date().toISOString(),
              stripeChargeId: paymentIntent.latest_charge ?? null,
            });
            console.log('✅ Tag order marked paid:', orderId);
            // TODO: dispatch to tag manufacturer (engraving + ship). Until
            // a provider is wired, status stays 'paid' and ops fulfills manually.
          }
        }

        // Printed-passport order (Phase 3). We pre-created the orderId at
        // PaymentIntent creation time and stashed it in metadata.
        if (paymentIntent.metadata?.type === 'printed_passport') {
          const orderId = paymentIntent.metadata.orderId;
          if (orderId) {
            await adminDb.collection('passportOrders').doc(orderId).update({
              status: 'paid',
              paidAt: new Date().toISOString(),
              stripeChargeId: paymentIntent.latest_charge ?? null,
            });
            console.log('✅ Passport order marked paid:', orderId);
            // TODO: dispatch to POD provider here (Gelato / Printful / Lob).
            // The order doc has address, petId, petName — pull pet photo + the
            // saved passport snapshot from `passports/` and submit the print
            // job. On success, write { status: 'in_production', podJobId }.
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('❌ Payment failed:', paymentIntent.id);

        if (paymentIntent.metadata?.type === 'shop_physical') {
          const orderId = paymentIntent.metadata.orderId;
          if (orderId) {
            await adminDb.collection('shopOrders').doc(orderId).update({
              status: 'failed',
              failedAt: new Date().toISOString(),
              failureCode: paymentIntent.last_payment_error?.code ?? null,
              failureMessage: paymentIntent.last_payment_error?.message ?? null,
            });
          }
        }

        if (paymentIntent.metadata?.type === 'qr_collar_tag') {
          const orderId = paymentIntent.metadata.orderId;
          if (orderId) {
            await adminDb.collection('tagOrders').doc(orderId).update({
              status: 'failed',
              failedAt: new Date().toISOString(),
              failureCode: paymentIntent.last_payment_error?.code ?? null,
              failureMessage: paymentIntent.last_payment_error?.message ?? null,
            });
          }
        }

        if (paymentIntent.metadata?.type === 'printed_passport') {
          const orderId = paymentIntent.metadata.orderId;
          if (orderId) {
            await adminDb.collection('passportOrders').doc(orderId).update({
              status: 'failed',
              failedAt: new Date().toISOString(),
              failureCode: paymentIntent.last_payment_error?.code ?? null,
              failureMessage: paymentIntent.last_payment_error?.message ?? null,
            });
          }
        }
        break;
      }

      default:
        console.log('⚠️ Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
