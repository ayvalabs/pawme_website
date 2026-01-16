'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Header } from '@/app/components/header';
import { Hero } from '@/app/components/hero';
import { Features } from '@/app/components/features';
import { HowItWorks } from '@/app/components/how-it-works';
import { ProductFeatures } from '@/app/components/product-features';
import { ReferralProgram } from '@/app/components/referral-program';
import { Timeline } from '@/app/components/timeline';
import { CTA } from '@/app/components/cta';
import { Footer } from '@/app/components/footer';
import { FloatingActions } from '@/app/components/floating-actions';
import { BottomFloatingCTA } from '@/app/components/bottom-floating-cta';
import { AuthDialog } from '@/app/components/auth-dialog';
import { ReferralDashboard } from '@/app/components/referral-dashboard';
import { Skeleton } from '@/app/components/ui/skeleton';

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        setReferralCodeFromUrl(refCode);
        setAuthDialogOpen(true);
        setAuthDefaultTab('signup');
      }
    }
  }, []);

  const handleEmailSubmitInCTA = () => {
    setAuthDefaultTab('signup');
    setAuthDialogOpen(true);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[80vh] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user && profile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow pt-24">
          <ReferralDashboard 
            email={profile.email} 
            referralCode={profile.referralCode} 
            referralCount={profile.referralCount}
          />
        </main>
        <Footer />
        <FloatingActions />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Features />
        <ProductFeatures />
        <HowItWorks />
        <ReferralProgram />
        <Timeline />
        <CTA onEmailSubmit={handleEmailSubmitInCTA} />
      </main>
      <Footer />
      <FloatingActions />
      <BottomFloatingCTA />
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDefaultTab}
        referralCode={referralCodeFromUrl}
      />
    </div>
  );
}
