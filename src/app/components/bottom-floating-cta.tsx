import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Rocket, Crown, CreditCard, X, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthDialog } from '@/app/components/auth-dialog';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface PaymentMethod {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export function BottomFloatingCTA() {
  const { user, profile, refreshProfile } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const handleJoinWaitlist = () => {
    setAuthDialogOpen(true);
  };

  const handleUpgradeToPriority = () => {
    setPriorityDialogOpen(true);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setPaymentMethod({
        ...paymentMethod,
        cardNumber: formatCardNumber(value),
      });
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setPaymentMethod({
        ...paymentMethod,
        expiryDate: formatExpiryDate(value),
      });
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPaymentMethod({
        ...paymentMethod,
        cvv: value,
      });
    }
  };

  const handleSubmitPayment = async () => {
    if (!paymentMethod.cardNumber || !paymentMethod.expiryDate || !paymentMethod.cvv || !paymentMethod.cardholderName) {
      toast.error('Please fill in all payment details');
      return;
    }

    if (paymentMethod.cardNumber.replace(/\s/g, '').length !== 16) {
      toast.error('Please enter a valid card number');
      return;
    }

    if (paymentMethod.expiryDate.length !== 5) {
      toast.error('Please enter a valid expiry date (MM/YY)');
      return;
    }

    if (paymentMethod.cvv.length < 3) {
      toast.error('Please enter a valid CVV');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2b924d9/priority-upgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId: user?.id,
            paymentMethod: {
              cardLast4: paymentMethod.cardNumber.slice(-4),
              cardholderName: paymentMethod.cardholderName,
              // In production, never send full card details to backend
              // This would go through a payment processor like Stripe
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();

      // Clear payment form
      setPaymentMethod({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
      });

      setPriorityDialogOpen(false);
      toast.success('Welcome to Priority List! 🎉');
      
      // Refresh profile to get updated status
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Priority upgrade error:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isPriority = profile?.isPriority === true;

  if (isPriority) {
    // Don't show the button if user is already on priority list
    return null;
  }

  return (
    <>
      {/* Bottom Floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto px-4 pb-6">
          <div className="pointer-events-auto">
            <Button
              onClick={() => window.open('https://www.kickstarter.com/', '_blank')}
              size="lg"
              className="w-full h-14 text-base font-semibold shadow-2xl hover:shadow-3xl transition-all hover:scale-105 bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 group relative overflow-hidden animate-pulse rounded-full"
            >
              {/* Flashing overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rounded-full" />
              
              {/* Pulsing ring effect */}
              <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" style={{ animationDuration: '2s' }} />
              
              <span className="relative z-10 flex items-center justify-center gap-2">
                🚀 Join Kickstarter Waitlist 🎉
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Auth Dialog */}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />

      {/* Priority Upgrade Dialog */}
      {priorityDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl border-2 border-amber-500/30 animate-in zoom-in-95">
            <CardHeader className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500 rounded-full">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Join Priority List</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Get first access for just $1
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPriorityDialogOpen(false)}
                  className="absolute top-0 right-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Benefits */}
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Priority Benefits
                </h4>
                <ul className="space-y-1.5 text-sm text-amber-800 dark:text-amber-200">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>First access to Kickstarter launch (24h early)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Exclusive early bird pricing guaranteed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Limited edition priority badge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>VIP updates and behind-the-scenes content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Priority customer support</span>
                  </li>
                </ul>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>Secure payment - One time charge of $1.00</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      placeholder="John Doe"
                      value={paymentMethod.cardholderName}
                      onChange={(e) =>
                        setPaymentMethod({ ...paymentMethod, cardholderName: e.target.value })
                      }
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={paymentMethod.cardNumber}
                      onChange={handleCardNumberChange}
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        value={paymentMethod.expiryDate}
                        onChange={handleExpiryDateChange}
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        type="password"
                        value={paymentMethod.cvv}
                        onChange={handleCvvChange}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubmitPayment}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="w-5 h-5 mr-2" />
                      Secure Priority Access - $1.00
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  🔒 Your payment information is secure and encrypted
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
