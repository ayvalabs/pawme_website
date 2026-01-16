
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
} from 'firebase/firestore';
import { auth, db } from '@/firebase/config';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  referralCode: string;
  points: number;
  referralCount: number;
  referredBy: string | null;
  theme: string;
  rewards: any[];
  createdAt: string;
  isPriority?: boolean;
  privacyPolicyAgreed: boolean;
  marketingOptIn: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, referredByCode: string | undefined, privacyPolicyAgreed: boolean, marketingOptIn: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTheme: (theme: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function generateReferralCode(email: string, uid: string): Promise<string> {
  // Use first part of email and first 6 chars of UID for uniqueness
  const namePart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const uidPart = uid.substring(0, 6).toUpperCase();
  let referralCode = `${namePart}${uidPart}`.slice(0, 10);
  
  // Ensure it's at least 6 characters by padding with UID if needed
  if (referralCode.length < 6) {
    referralCode = (referralCode + uid.toUpperCase()).slice(0, 10);
  }
  
  // Check if code already exists (extremely unlikely with UID, but safety check)
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('referralCode', '==', referralCode));
  const querySnapshot = await getDocs(q);
  
  // If duplicate found (should never happen), append more UID characters
  if (!querySnapshot.empty) {
    referralCode = (namePart + uid.substring(0, 8)).toUpperCase().slice(0, 10);
  }
  
  return referralCode;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  const creditReferrer = async (referralCode: string) => {
    const referralsRef = collection(db, 'users');
    const q = query(referralsRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const referrerDoc = querySnapshot.docs[0];
      const referrerRef = doc(db, 'users', referrerDoc.id);

      await runTransaction(db, async (transaction) => {
        const referrerDoc = await transaction.get(referrerRef);
        if (!referrerDoc.exists()) {
          throw "Referrer document does not exist!";
        }
        const newReferralCount = (referrerDoc.data().referralCount || 0) + 1;
        const newPoints = (referrerDoc.data().points || 0) + 100;
        transaction.update(referrerRef, { 
          referralCount: newReferralCount,
          points: newPoints
        });
      });
      console.log(`Credited referrer ${referrerDoc.id}`);
    } else {
      console.log(`Referral code ${referralCode} not found.`);
    }
  };

  const signUp = async (email: string, password: string, name: string, referredByCode: string | undefined, privacyPolicyAgreed: boolean, marketingOptIn: boolean) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    await updateUserProfile(newUser, { displayName: name });

    const referralCode = await generateReferralCode(email, newUser.uid);
    const userProfile: UserProfile = {
      id: newUser.uid,
      email: newUser.email!,
      name: name || newUser.email!.split('@')[0],
      referralCode,
      points: 100, // Initial points for signing up
      referralCount: 0,
      referredBy: referredByCode || null,
      theme: 'purple',
      rewards: [],
      createdAt: new Date().toISOString(),
      privacyPolicyAgreed,
      marketingOptIn,
    };

    await setDoc(doc(db, 'users', newUser.uid), userProfile);
    
    if (referredByCode) {
      await creditReferrer(referredByCode);
    }

    // Send welcome email
    console.log('=== SENDING WELCOME EMAIL ===');
    console.log('Email recipient:', email);
    console.log('User name:', name);
    console.log('Referral code:', referralCode);
    try {
      const emailPayload = {
        to: email,
        templateType: 'welcome',
        variables: {
          userName: name,
          referralCode: referralCode,
        },
      };
      console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });
      
      console.log('Email API response status:', response.status);
      const responseData = await response.json();
      console.log('Email API response data:', JSON.stringify(responseData, null, 2));
      
      if (response.ok) {
        console.log('✅ Welcome email sent successfully!');
        console.log('Resend email ID:', responseData.data?.id);
        console.log('Check your email inbox for:', email);
        console.log('Email sent from: pawme@ayvalabs.com');
      } else {
        console.error('❌ Email API returned error:', responseData);
      }
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      // Don't fail signup if email fails
    }
    console.log('=== EMAIL SENDING COMPLETE ===');

    setUser(newUser);
    setProfile(userProfile);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create profile for new Google user
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
        privacyPolicyAgreed: true, // Implied agreement for social sign-in
        marketingOptIn: false, // Default to not opted-in
      };
      await setDoc(userDocRef, userProfile);
      setProfile(userProfile);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    document.documentElement.setAttribute('data-theme', 'purple');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const updateTheme = async (theme: string) => {
    console.log('updateTheme called with theme:', theme);
    if (user) {
      console.log('User exists, updating theme for user:', user.uid);
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { theme });
        console.log('Theme updated successfully in Firestore');
        await fetchProfile(user.uid); // Refresh profile after update
        console.log('Profile refreshed, new theme should be:', theme);
      } catch (error) {
        console.error('Error updating theme:', error);
      }
    } else {
      console.log('No user found, cannot update theme');
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
