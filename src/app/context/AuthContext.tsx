
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
import { getTotalUsers } from '@/app/actions/users';
import { sendWelcomeEmail } from '@/app/actions/email';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  referralCode: string;
  points: number;
  referralCount: number;
  referredBy: string | null;
  theme: string;
  rewards: { rewardId: string; redeemedAt: string }[];
  createdAt: string;
  isVip?: boolean;
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
  joinVip: () => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
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
      const referrerDocSnapshot = querySnapshot.docs[0];
      const referrerRef = doc(db, 'users', referrerDocSnapshot.id);

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
      points: 100,
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
    
    if (referredByCode) {
      await creditReferrer(referredByCode);
    }
    
    const totalUsers = await getTotalUsers();
    await sendWelcomeEmail({ to: email, name, referralCode, totalUsers });

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
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { theme });
        await fetchProfile(user.uid);
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
        await fetchProfile(user.uid);
      } catch (error) {
        console.error('Error joining VIP:', error);
        throw error;
      }
    }
  };

  const redeemReward = async (rewardId: string) => {
    if (user && profile) {
      const userDocRef = doc(db, 'users', user.uid);
      const newReward = { rewardId, redeemedAt: new Date().toISOString() };
      const updatedRewards = [...profile.rewards, newReward];
      try {
        await updateDoc(userDocRef, { rewards: updatedRewards });
        await fetchProfile(user.uid);
      } catch (error) {
        console.error('Error redeeming reward:', error);
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
