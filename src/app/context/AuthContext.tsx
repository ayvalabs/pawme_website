
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
  runTransaction,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { sendWelcomeEmail, sendReferralSuccessEmail } from '@/app/actions/email';
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
  const uidPart = uid.substring(0, 6).toUpperCase();
  let referralCode = `${namePart}${uidPart}`.slice(0, 10);
  
  if (referralCode.length < 6) {
    referralCode = (referralCode + uid.toUpperCase()).slice(0, 10);
  }
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('referralCode', '==', referralCode));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    referralCode = (namePart + uid.substring(0, 8)).toUpperCase().slice(0, 10);
  }
  
  return referralCode;
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

  const creditReferrer = async (referralCode: string, newSignedUpEmail: string) => {
    const referralsRef = collection(db, 'users');
    const q = query(referralsRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const referrerDocSnapshot = querySnapshot.docs[0];
      const referrerRef = doc(db, 'users', referrerDocSnapshot.id);

      if (referrerDocSnapshot.data().email === newSignedUpEmail) {
        console.warn('Self-referral attempt blocked.');
        return;
      }

      await runTransaction(db, async (transaction) => {
        const referrerDoc = await transaction.get(referrerRef);
        if (!referrerDoc.exists()) {
          throw "Referrer document does not exist!";
        }
        const newReferralCount = (referrerDoc.data().referralCount || 0) + 1;
        const pointsToAdd = referrerDoc.data().isVip ? 150 : 100;
        const newPoints = (referrerDoc.data().points || 0) + pointsToAdd;
        
        transaction.update(referrerRef, { 
          referralCount: newReferralCount,
          points: newPoints
        });

        const referrerData = referrerDoc.data();
        if (referrerData.email) {
          await sendReferralSuccessEmail({
            to: referrerData.email,
            referrerName: referrerData.name,
            newReferralCount: newReferralCount,
            newPoints: newPoints
          });
        }
      });
      console.log(`Credited referrer ${referrerDocSnapshot.id}`);
    } else {
      console.log(`Referral code ${referralCode} not found.`);
    }
  };

  const signUp = async (email: string, password: string, name: string, code: string, referredByCode: string | undefined, privacyPolicyAgreed: boolean, marketingOptIn: boolean) => {
    console.log('[SIGNUP] Starting signup process for:', email);
    
    try {
      console.log('[SIGNUP] Step 1: Verifying code...');
      const verificationsRef = collection(db, 'verifications');
      const q = query(verificationsRef, where('email', '==', email), where('code', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Invalid verification code.');
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
        points: 100, // Starting points
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
        await creditReferrer(referredByCode, email);
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
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Password reset email sent! Check your inbox.' };
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
      }
      return { success: false, message: 'Failed to send password reset email.' };
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
