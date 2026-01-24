'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { CreditCard, Lock } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a1a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#a0a0a0',
      },
      padding: '12px',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
  showIcon: true,
};

interface PaymentFormProps {
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ userId, userEmail, userName, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [expiryComplete, setExpiryComplete] = useState(false);
  const [cvcComplete, setCvcComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system not loaded. Please refresh the page.');
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      toast.error('Card details not found');
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const { createPaymentIntent } = await import('@/app/actions/stripe');
      const result = await createPaymentIntent(100); // $1.00 in cents

      if (result.error || !result.clientSecret) {
        toast.error(result.error || 'Failed to initialize payment');
        setLoading(false);
        return;
      }

      // Confirm payment with card details
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        result.clientSecret,
        {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              email: userEmail,
              name: userName,
            },
          },
        }
      );

      if (confirmError) {
        toast.error(confirmError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Update user to VIP in Firestore
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/config');
        
        await updateDoc(doc(db, 'users', userId), {
          isVip: true,
          vipPaidAt: new Date(),
          stripePaymentIntentId: paymentIntent.id,
        });

        // Send VIP receipt email
        const { sendVipDepositReceiptEmail } = await import('@/app/actions/email');
        await sendVipDepositReceiptEmail({
          to: userEmail,
          name: userName,
          amount: '$1.00',
        });

        toast.success('Payment successful! Welcome to VIP! 👑');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const isFormComplete = cardNumberComplete && expiryComplete && cvcComplete;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Card Number */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Card Number
          </label>
          <div className="relative">
            <div className="border border-input rounded-md p-3 bg-background hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <CardNumberElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={(e) => setCardNumberComplete(e.complete)}
              />
            </div>
            {cardNumberComplete && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                ✓
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your 16-digit card number (spaces added automatically)
          </p>
        </div>

        {/* Expiry and CVC */}
        <div className="grid grid-cols-2 gap-4">
          {/* Expiry Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Expiry Date
            </label>
            <div className="relative">
              <div className="border border-input rounded-md p-3 bg-background hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <CardExpiryElement
                  options={CARD_ELEMENT_OPTIONS}
                  onChange={(e) => setExpiryComplete(e.complete)}
                />
              </div>
              {expiryComplete && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                  ✓
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">MM/YY</p>
          </div>

          {/* CVC */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" />
              CVC
            </label>
            <div className="relative">
              <div className="border border-input rounded-md p-3 bg-background hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <CardCvcElement
                  options={CARD_ELEMENT_OPTIONS}
                  onChange={(e) => setCvcComplete(e.complete)}
                />
              </div>
              {cvcComplete && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                  ✓
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">3 digits</p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Secure Payment
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Your card details are encrypted and never stored on our servers. Powered by Stripe.
            </p>
          </div>
        </div>
      </div>

      {/* Refund Policy */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Fully Refundable:</strong> You can request a refund at any time before our Kickstarter launch.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !isFormComplete || loading}
          className="flex-1"
        >
          {loading ? 'Processing...' : 'Pay $1.00 Deposit'}
        </Button>
      </div>

      {/* Test Card Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Test Mode - Use test card:
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 font-mono">
            4242 4242 4242 4242 | Any future date | Any 3 digits
          </p>
        </div>
      )}
    </form>
  );
}

export function VipPaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
}
