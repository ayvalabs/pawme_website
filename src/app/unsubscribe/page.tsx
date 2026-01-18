
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { unsubscribeUser } from '@/app/actions/users';
import { toast } from 'sonner';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      setMessage('No email address provided. Please check the link and try again.');
    }
  }, [email]);

  const handleUnsubscribe = async () => {
    if (!email) return;

    setStatus('loading');
    try {
      const result = await unsubscribeUser(email);
      if (result.success) {
        setStatus('success');
        setMessage('You have been successfully unsubscribed from all marketing emails. You may still receive transactional emails like password resets.');
        toast.success('Successfully unsubscribed!');
      } else {
        setStatus('error');
        setMessage(result.message || 'An error occurred. Please try again.');
        toast.error(result.message || 'An error occurred.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred. Please contact support.');
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Unsubscribe</CardTitle>
            <CardDescription>
              We're sorry to see you go.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {status === 'idle' && (
              <>
                <p>
                  Are you sure you want to unsubscribe <strong className="text-primary">{email}</strong> from our marketing and promotional emails?
                </p>
                <Button onClick={handleUnsubscribe} size="lg">
                  Confirm Unsubscribe
                </Button>
              </>
            )}

            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Processing your request...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-4 text-green-600">
                <CheckCircle2 className="w-16 h-16" />
                <p className="font-semibold text-lg">Unsubscribed Successfully</p>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 text-destructive">
                <AlertCircle className="w-16 h-16" />
                <p className="font-semibold text-lg">An Error Occurred</p>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
