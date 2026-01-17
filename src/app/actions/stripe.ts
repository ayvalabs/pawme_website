
'use server';

import Stripe from 'stripe';

export async function createPaymentIntent(amount: number) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Stripe secret key is not set.');
    return { error: 'Payment service is not configured on the server.' };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    return { error: 'Failed to create PaymentIntent.' };
  }
}
