
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Header } from '@/app/components/header';
import { Hero } from '@/app/components/hero';
import { Features } from '@/app/components/features';
import { HowItWorks } from '@/app/components/how-it-works';
import { ProductFeatures } from '@/app/components/product-features';
import { AppFeatures } from '@/app/components/app-features';
import { ReferralProgram } from '@/app/components/referral-program';
import { Timeline } from '@/app/components/timeline';
import { CTA } from '@/app/components/cta';
import { Footer } from '@/app/components/footer';
import { FloatingActions } from '@/app/components/floating-actions';
import { BottomFloatingCTA } from '@/app/components/bottom-floating-cta';
import { AuthDialog } from '@/app/components/auth-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { defaultTemplates } from '@/lib/email-templates';
import { db } from '@/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        console.log('🔗 [LANDING PAGE] Referral code detected in URL:', refCode);
        setReferralCodeFromUrl(refCode);
        if (!user) {
          console.log('👤 [LANDING PAGE] User not logged in, opening signup dialog');
          setAuthDialogOpen(true);
          setAuthDefaultTab('signup');
        } else {
          console.log('👤 [LANDING PAGE] User already logged in:', user.email);
        }
      } else {
        console.log('🔗 [LANDING PAGE] No referral code in URL');
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      console.log('📧 [LANDING PAGE] Current user email:', user.email);
    } else {
      console.log('📧 [LANDING PAGE] No user logged in');
    }
  }, [user]);

  // Log all email templates and test Firebase security
  useEffect(() => {
    const logEmailTemplatesAndTestFirebase = async () => {
      console.log('\n========================================');
      console.log('📧 EMAIL TEMPLATES AVAILABLE');
      console.log('========================================');
      
      const templates = Object.values(defaultTemplates);
      console.log(`Total templates: ${templates.length}\n`);
      
      templates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name} (${template.id})`);
        console.log(`   Subject: ${template.subject}`);
        console.log(`   Variables: ${template.variables.join(', ')}`);
        console.log('');
      });

      console.log('========================================');
      console.log('🔒 FIREBASE SECURITY TEST');
      console.log('========================================\n');

      // Test 1: Verifications collection (should be accessible)
      try {
        console.log('Test 1: Testing verifications collection access...');
        const verificationsRef = collection(db, 'verifications');
        const verificationsSnap = await getDocs(verificationsRef);
        console.log('✅ SUCCESS: Can read verifications collection');
        console.log(`   Found ${verificationsSnap.size} verification documents`);
      } catch (error: any) {
        console.error('❌ FAILED: Cannot read verifications collection');
        console.error('   Error:', error.message);
      }

      // Test 2: Users collection (should require auth for read)
      try {
        console.log('\nTest 2: Testing users collection access...');
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        if (user) {
          console.log('✅ SUCCESS: Can read users collection (authenticated)');
          console.log(`   Found ${usersSnap.size} user documents`);
        } else {
          console.log('⚠️  WARNING: Can read users collection without auth');
          console.log(`   Found ${usersSnap.size} user documents`);
        }
      } catch (error: any) {
        if (!user) {
          console.log('✅ EXPECTED: Cannot read users collection (not authenticated)');
          console.log('   Error:', error.message);
        } else {
          console.error('❌ FAILED: Cannot read users collection even when authenticated');
          console.error('   Error:', error.message);
        }
      }

      // Test 3: App settings collection (should be publicly readable)
      try {
        console.log('\nTest 3: Testing app-settings collection access...');
        const settingsRef = collection(db, 'app-settings');
        const settingsSnap = await getDocs(settingsRef);
        console.log('✅ SUCCESS: Can read app-settings collection');
        console.log(`   Found ${settingsSnap.size} settings documents`);
      } catch (error: any) {
        console.error('❌ FAILED: Cannot read app-settings collection');
        console.error('   Error:', error.message);
      }

      console.log('\n========================================');
      console.log('📊 FIREBASE CONFIG STATUS');
      console.log('========================================');
      console.log('Firebase initialized:', !!db);
      console.log('User authenticated:', !!user);
      if (user) {
        console.log('User email:', user.email);
        console.log('User UID:', user.uid);
      }
      console.log('========================================\n');
    };

    logEmailTemplatesAndTestFirebase();
  }, [user]);

  const handleOpenAuthDialog = () => {
    setAuthDefaultTab('signup');
    setAuthDialogOpen(true);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen p-4 space-y-4 bg-background">
        <Skeleton className="w-full h-16" />
        <Skeleton className="w-full h-[80vh]" />
        <Skeleton className="w-full h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header variant="transparent" />
      <main className="flex-grow">
        <Hero />
        <AppFeatures />
        <Features />
        <ProductFeatures />
        <HowItWorks />
        <ReferralProgram />
        <Timeline />
        <CTA onEmailSubmit={handleOpenAuthDialog} />
      </main>
      <Footer />
      <FloatingActions />
      {!user && <BottomFloatingCTA onClick={handleOpenAuthDialog} />}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDefaultTab}
        referralCode={referralCodeFromUrl}
      />
    </div>
  );
}
