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
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('❌ Payment failed:', paymentIntent.id);
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
