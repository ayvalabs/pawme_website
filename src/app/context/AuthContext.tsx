
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  updateProfile as updateUserProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { sendWelcomeEmail, sendCustomPasswordResetEmail, sendReferralSuccessEmail } from '@/app/actions/email';
import { isDisposableEmail } from '@/lib/disposable-domains';

export interface Reward {
  rewardId: string;
  redeemedAt: string;
  status: 'pending' | 'shipped';
  trackingCode?: string;
  shippingAddress?: {
    fullName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  referralCode: string;
  points: number;
  referralCount: number;
  referredBy: string | null;
  theme: string;
  rewards: Reward[];
  createdAt: string;
  isVip?: boolean;
  privacyPolicyAgreed: boolean;
  marketingOptIn: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, code: string, referredByCode: string | undefined, privacyPolicyAgreed: boolean, marketingOptIn: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  signInWithGoogle: () => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTheme: (theme: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  joinVip: () => Promise<void>;
  redeemReward: (rewardId: string, shippingAddress: any) => Promise<void>;
  updateMarketingPreference: (optIn: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function generateReferralCode(email: string, uid: string): Promise<string> {
  const namePart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Try up to 5 times to generate a unique code
  for (let attempt = 0; attempt < 5; attempt++) {
    let referralCode: string;
    
    if (attempt === 0) {
      // First attempt: use first 6 chars of name + first 4 of UID
      const uidPart = uid.substring(0, 4).toUpperCase();
      referralCode = `${namePart}${uidPart}`.slice(0, 10);
    } else {
      // Subsequent attempts: add random suffix for uniqueness
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      referralCode = `${namePart}${randomSuffix}`.slice(0, 10);
    }
    
    // Ensure minimum length
    if (referralCode.length < 6) {
      const randomPad = Math.random().toString(36).substring(2, 8).toUpperCase();
      referralCode = (referralCode + randomPad).slice(0, 10);
    }
    
    // Check if code already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return referralCode;
    }
  }
  
  // Fallback: use timestamp-based code
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${namePart}${timestamp}`.slice(0, 10);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let profileListenerUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (profileListenerUnsubscribe) {
        profileListenerUnsubscribe();
        profileListenerUnsubscribe = undefined;
      }
      
      setUser(user);
      
      if (user) {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        profileListenerUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.warn("User profile document doesn't exist for UID:", user.uid);
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to profile updates:", error);
          setProfile(null);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileListenerUnsubscribe) {
        profileListenerUnsubscribe();
      }
    };
  }, []);

  const fetchProfile = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProfile(docSnap.data() as UserProfile);
    } else {
      console.log('No such profile!');
    }
  };

  const signUp = async (email: string, password: string, name: string, code: string, referredByCode: string | undefined, privacyPolicyAgreed: boolean, marketingOptIn: boolean) => {
    console.log('[SIGNUP] Starting signup process for:', email);
    
    try {
      console.log('[SIGNUP] Step 1: Verifying code...');
      console.log('[SIGNUP] Looking for verification with email:', email);
      console.log('[SIGNUP] Looking for verification with code:', code);
      console.log('[SIGNUP] Code type:', typeof code);
      console.log('[SIGNUP] Code length:', code.length);
      
      // Normalize the code to string and trim whitespace
      const normalizedCode = String(code).trim();
      console.log('[SIGNUP] Normalized code:', normalizedCode);
      
      const verificationsRef = collection(db, 'verifications');
      const q = query(verificationsRef, where('email', '==', email), where('code', '==', normalizedCode));
      const querySnapshot = await getDocs(q);

      console.log('[SIGNUP] Query returned', querySnapshot.size, 'documents');
      
      if (querySnapshot.empty) {
        // Debug: Check all verifications for this email
        const emailOnlyQuery = query(verificationsRef, where('email', '==', email));
        const emailDocs = await getDocs(emailOnlyQuery);
        console.log('[SIGNUP] Found', emailDocs.size, 'verifications for this email');
        emailDocs.forEach(doc => {
          const data = doc.data();
          console.log('[SIGNUP] Stored code:', data.code, 'Type:', typeof data.code);
          console.log('[SIGNUP] Entered code:', code, 'Type:', typeof code);
          console.log('[SIGNUP] Normalized entered code:', normalizedCode);
          console.log('[SIGNUP] Direct match:', data.code === code);
          console.log('[SIGNUP] Normalized match:', String(data.code).trim() === normalizedCode);
        });
        throw new Error('Invalid verification code. Please check the code and try again.');
      }

      const verificationDoc = querySnapshot.docs[0];
      const verificationData = verificationDoc.data();

      if (verificationData.expiresAt.toMillis() < Date.now()) {
        await deleteDoc(verificationDoc.ref);
        throw new Error('Verification code has expired. Please try again.');
      }
      
      if (isDisposableEmail(email)) {
        throw new Error("Disposable email addresses are not allowed. Please use a permanent email address.");
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      await updateUserProfile(newUser, { displayName: name });

      const referralCode = await generateReferralCode(email, newUser.uid);
      
      const userProfile: UserProfile = {
        id: newUser.uid,
        email: newUser.email!,
        name: name || newUser.email!.split('@')[0],
        referralCode,
        points: 100, // Start with 100 points
        referralCount: 0,
        referredBy: referredByCode || null,
        theme: 'purple',
        rewards: [],
        createdAt: new Date().toISOString(),
        isVip: false,
        privacyPolicyAgreed,
        marketingOptIn,
      };

      await setDoc(doc(db, 'users', newUser.uid), userProfile);
      
      await deleteDoc(verificationDoc.ref);
      
      if (referredByCode) {
        console.log('🔵 [SIGNUP] Step 8: Crediting referrer...');
        try {
          // Credit referrer inline (client-side with auth context)
          const referralsRef = collection(db, 'users');
          const q = query(referralsRef, where('referralCode', '==', referredByCode));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const referrerDocSnapshot = querySnapshot.docs[0];
            const referrerRef = doc(db, 'users', referrerDocSnapshot.id);
            const referrerData = referrerDocSnapshot.data() as UserProfile;

            if (referrerData.email === email) {
              console.warn('⚠️  [SIGNUP] Self-referral attempt blocked.');
            } else {
              const oldPoints = referrerData.points || 0;
              const pointsToAdd = referrerData.isVip ? 150 : 100;
              const newPoints = oldPoints + pointsToAdd;
              const newReferralCount = (referrerData.referralCount || 0) + 1;

              await updateDoc(referrerRef, { 
                referralCount: newReferralCount,
                points: newPoints
              });

              console.log(`✅ [SIGNUP] Credited referrer ${referrerDocSnapshot.id} with ${pointsToAdd} points`);

              // Send referral success email (this is a server action, runs separately)
              if (referrerData.email) {
                await sendReferralSuccessEmail({
                  to: referrerData.email,
                  referrerName: referrerData.name,
                  newUserName: name,
                  oldPoints: oldPoints,
                  newPoints: newPoints,
                  newReferralCount: newReferralCount,
                });
              }
            }
          } else {
            console.log(`⚠️  [SIGNUP] Referral code ${referredByCode} not found.`);
          }
        } catch (error) {
          console.error('❌ [SIGNUP] Error crediting referrer:', error);
          // Don't fail signup if referral credit fails
        }
        console.log('✅ [SIGNUP] Referrer credit process completed');
      }
      
      await sendWelcomeEmail({ to: email, name, referralCode });

      setUser(newUser);
      setProfile(userProfile);
    } catch (error: any) {
      console.error('[SIGNUP] Error during signup:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please sign in.');
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (userCredential.user.email === 'pawme@ayvalabs.com') {
        router.push('/dashboard');
      } else {
        router.push('/leaderboard');
      }
      return userCredential.user;
    } catch (error: any) {
        console.error('[SIGNIN] Firebase sign-in failed for:', email, 'Code:', error.code, 'Message:', error.message);
        throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendCustomPasswordResetEmail({ email });
      return { success: true };
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`Password reset requested for non-existent user: ${email}`);
        return { success: true, message: 'If an account with this email exists, a password reset link has been sent.' };
      }
      console.error('Password reset error:', error);
      return { success: false, message: 'Could not send password reset email.' };
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const referralCode = await generateReferralCode(user.email!, user.uid);
      const userProfile: UserProfile = {
        id: user.uid,
        email: user.email!,
        name: user.displayName || user.email!.split('@')[0],
        referralCode,
        points: 100,
        referralCount: 0,
        referredBy: null,
        theme: 'purple',
        rewards: [],
        createdAt: new Date().toISOString(),
        isVip: false,
        privacyPolicyAgreed: true,
        marketingOptIn: false,
      };
      await setDoc(userDocRef, userProfile);
      setProfile(userProfile);
    }
    
    if (user.email === 'pawme@ayvalabs.com') {
      router.push('/dashboard');
    } else {
      router.push('/leaderboard');
    }

    return user;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    document.documentElement.setAttribute('data-theme', 'purple');
  };

  const refreshProfile = async () => {
    // With real-time updates via onSnapshot, this function is no longer needed
    // for data consistency, but is kept for any UI that might want to provide
    // a manual refresh action for user peace of mind.
    console.log('Profile data is updated in real-time.');
  };

  const updateTheme = async (theme: string) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { theme });
      } catch (error) {
        console.error('Error updating theme:', error);
      }
    }
  };

  const joinVip = async () => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { isVip: true });
      } catch (error) {
        console.error('Error joining VIP:', error);
        throw error;
      }
    }
  };

  const redeemReward = async (rewardId: string, shippingAddress: any) => {
    if (user && profile) {
      const userDocRef = doc(db, 'users', user.uid);
      const newReward: Reward = { 
        rewardId, 
        redeemedAt: new Date().toISOString(),
        status: 'pending',
        shippingAddress,
      };
      const updatedRewards = [...(profile.rewards || []), newReward];
      try {
        await updateDoc(userDocRef, { rewards: updatedRewards });
      } catch (error) {
        console.error('Error redeeming reward:', error);
        throw error;
      }
    }
  };

  const updateMarketingPreference = async (optIn: boolean) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { marketingOptIn: optIn });
      } catch (error) {
        console.error('Error updating marketing preference:', error);
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        updateTheme,
        sendPasswordReset,
        joinVip,
        redeemReward,
        updateMarketingPreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
