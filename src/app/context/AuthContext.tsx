
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
  deleteUser,
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
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; code?: string; expiresAt?: number }>;
  joinVip: () => Promise<void>;
  redeemReward: (rewardId: string, shippingAddress: any) => Promise<void>;
  updateMarketingPreference: (optIn: boolean) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function generateReferralCode(name: string, uid: string): Promise<string> {
  // Helper function to generate random alphanumeric string
  const generateRandomAlphanumeric = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Get first 4 characters from name (or pad if shorter)
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const namePart = cleanName.substring(0, 4).padEnd(4, 'X');
  
  console.log('[REFERRAL CODE] Generating code for name:', name);
  console.log('[REFERRAL CODE] Name part:', namePart);
  
  // Try up to 10 times to generate a unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    // Generate 4 random alphanumeric characters
    const randomPart = generateRandomAlphanumeric(4);
    const referralCode = `${namePart}${randomPart}`;
    
    console.log(`[REFERRAL CODE] Attempt ${attempt + 1}: Generated code ${referralCode}`);
    
    // Check if code already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('[REFERRAL CODE] Code is unique, using:', referralCode);
      return referralCode;
    }
    
    console.log('[REFERRAL CODE] Code already exists, trying again...');
  }
  
  // Fallback: use timestamp-based code (should be extremely rare)
  const timestamp = Date.now().toString(36).toUpperCase();
  const fallbackCode = `${namePart}${timestamp}`.slice(0, 8);
  console.log('[REFERRAL CODE] Fallback code:', fallbackCode);
  return fallbackCode;
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

      const referralCode = await generateReferralCode(name, newUser.uid);
      
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
      // Generate password reset link using Firebase Admin SDK and send custom email
      const { generatePasswordResetLink } = await import('@/app/actions/password-reset');
      const result = await generatePasswordResetLink({ email });
      
      return { success: result.success, message: result.message };
    } catch (error: any) {
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
      const referralCode = await generateReferralCode(user.displayName || user.email!.split('@')[0], user.uid);
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
    if (user && profile) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { isVip: true });
        
        // Send VIP deposit receipt email
        const { sendVipDepositReceiptEmail } = await import('@/app/actions/email');
        await sendVipDepositReceiptEmail({
          to: user.email!,
          name: profile.name,
          amount: '$1.00',
        });
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

  const deleteAccount = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      console.log('[DELETE ACCOUNT] Starting account deletion for:', user.email);
      
      // Delete user document from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await deleteDoc(userDocRef);
      console.log('[DELETE ACCOUNT] User document deleted from Firestore');
      
      // Delete all verification codes for this user
      const verificationsRef = collection(db, 'verifications');
      const q = query(verificationsRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log('[DELETE ACCOUNT] Verification codes deleted');
      
      // Delete Firebase Auth account
      await deleteUser(user);
      console.log('[DELETE ACCOUNT] Firebase Auth account deleted');
      
      // Sign out
      await signOut();
      console.log('[DELETE ACCOUNT] Account deletion complete');
    } catch (error) {
      console.error('[DELETE ACCOUNT] Error deleting account:', error);
      throw error;
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
        deleteAccount,
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
