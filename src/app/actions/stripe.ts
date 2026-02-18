
'use server';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendVipDepositReceiptEmail } from '@/app/actions/email';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

export async function createPaymentIntent(amount: number) {
  if (!stripe) {
    console.error('Stripe secret key is not set.');
    return { error: 'Payment service is not configured on the server.' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error: any) {
    console.error('Error creating PaymentIntent:', error);
    return { error: error.message || 'Failed to create PaymentIntent.' };
  }
}

/**
 * Create a Stripe Checkout Session for VIP membership payment
 * Amount: $1.00 USD (or HKD equivalent)
 */
export async function createVipCheckoutSession({ 
  userId, 
  userEmail, 
  userName,
  successUrl,
  cancelUrl,
}: { 
  userId: string; 
  userEmail: string; 
  userName: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  if (!stripe) {
    console.error('❌ Stripe secret key is not set.');
    return { error: 'Payment service is not configured.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9008';

  try {
    console.log('🔵 Creating VIP checkout session for:', userEmail);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // Can change to 'hkd' if you prefer
            product_data: {
              name: 'PawMe VIP Founding Member',
              description: 'Refundable $1 deposit for exclusive early access and perks',
              images: [`${appUrl}/logo.png`],
            },
            unit_amount: 100, // $1.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${appUrl}/dashboard?payment=cancelled`,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: {
        userId,
        userName,
        type: 'vip_deposit',
      },
      payment_intent_data: {
        metadata: {
          userId,
          userName,
          type: 'vip_deposit',
        },
      },
    });

    console.log('✅ Checkout session created:', session.id);

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    return { error: error.message || 'Failed to create checkout session.' };
  }
}

/**
 * Verify payment and update user VIP status
 * Called from webhook or after successful payment
 */
export async function verifyVipPayment(sessionId: string) {
  if (!stripe) {
    console.error('❌ Stripe secret key is not set.');
    return { success: false, error: 'Payment service not configured.' };
  }

  try {
    console.log('🔵 Verifying payment for session:', sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const userId = session.metadata?.userId;
      const userName = session.metadata?.userName;
      const userEmail = session.customer_email;

      console.log('✅ Payment verified for user:', userId);

      // Update Firestore VIP status (idempotent — safe even if webhook already ran)
      if (userId) {
        try {
          const userRef = adminDb.collection('users').doc(userId);
          const userDoc = await userRef.get();
          if (userDoc.exists && !userDoc.data()?.isVip) {
            await userRef.update({
              isVip: true,
              vipPaidAt: new Date(),
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent,
            });
            console.log('✅ User VIP status updated in Firestore (via verify fallback)');

            // Send receipt email if not already sent by webhook
            if (userEmail) {
              try {
                await sendVipDepositReceiptEmail({
                  to: userEmail,
                  name: userName || 'VIP Member',
                  amount: '$1.00',
                });
              } catch (emailErr) {
                console.error('⚠️ Receipt email failed (may have been sent by webhook):', emailErr);
              }
            }
          } else {
            console.log('ℹ️ User already marked as VIP (webhook likely handled it)');
          }
        } catch (dbErr) {
          console.error('⚠️ Firestore update failed in verify fallback:', dbErr);
        }
      }

      return {
        success: true,
        userId,
        userName,
        userEmail,
        amountPaid: session.amount_total ? session.amount_total / 100 : 1,
        currency: session.currency?.toUpperCase() || 'USD',
      };
    }

    return {
      success: false,
      error: 'Payment not completed',
    };
  } catch (error: any) {
    console.error('❌ Error verifying payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment',
    };
  }
}

/**
 * Create a refund for VIP deposit
 * Can be called before Kickstarter launch
 */
export async function refundVipDeposit(paymentIntentId: string, reason?: string) {
  if (!stripe) {
    console.error('❌ Stripe secret key is not set.');
    return { success: false, error: 'Payment service not configured.' };
  }

  try {
    console.log('🔵 Creating refund for payment:', paymentIntentId);

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
    });

    console.log('✅ Refund created:', refund.id);

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    };
  } catch (error: any) {
    console.error('❌ Error creating refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to create refund',
    };
  }
}
