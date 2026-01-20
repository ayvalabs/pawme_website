
'use server';

import { db } from '@/firebase/config';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { UserProfile, Reward } from '@/app/context/AuthContext';
import { sendReferralSuccessEmail } from './email';
import type { AppSettings } from '@/app/actions/settings';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  rank: number;
}

export async function creditReferrer(referralCode: string, newUser: UserProfile) {
  const referralsRef = collection(db, 'users');
  const q = query(referralsRef, where('referralCode', '==', referralCode));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const referrerDocSnapshot = querySnapshot.docs[0];
    const referrerRef = doc(db, 'users', referrerDocSnapshot.id);
    const referrerData = referrerDocSnapshot.data() as UserProfile;

    if (referrerData.email === newUser.email) {
      console.warn('Self-referral attempt blocked.');
      return;
    }

    const oldPoints = referrerData.points || 0;
    const pointsToAdd = referrerData.isVip ? 150 : 100;
    const newPoints = oldPoints + pointsToAdd;
    const newReferralCount = (referrerData.referralCount || 0) + 1;

    await updateDoc(referrerRef, { 
      referralCount: newReferralCount,
      points: newPoints
    });

    console.log(`Credited referrer ${referrerDocSnapshot.id}`);

    if (referrerData.email) {
      await sendReferralSuccessEmail({
        to: referrerData.email,
        referrerName: referrerData.name,
        newUserName: newUser.name,
        oldPoints: oldPoints,
        newPoints: newPoints,
        newReferralCount: newReferralCount,
      });
    }
  } else {
    console.log(`Referral code ${referralCode} not found.`);
  }
};

export async function getLeaderboard(): Promise<LeaderboardUser[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('points', 'desc'), limit(10));
  const querySnapshot = await getDocs(q);
  
  const leaderboard: LeaderboardUser[] = [];
  querySnapshot.forEach((doc, index) => {
    const data = doc.data();
    leaderboard.push({
      id: doc.id,
      name: data.name,
      points: data.points,
      rank: index + 1,
    });
  });

  return leaderboard;
}

export async function getUserRank(userId: string, points: number): Promise<number> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('points', '>', points));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count + 1;
}

export async function getTotalUsers(): Promise<number> {
  const usersRef = collection(db, 'users');
  const snapshot = await getCountFromServer(usersRef);
  return snapshot.data().count;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  const allUsers: UserProfile[] = [];
  querySnapshot.forEach((doc) => {
    allUsers.push({ id: doc.id, ...doc.data() } as UserProfile);
  });

  return allUsers;
}

export async function markRewardShipped(userId: string, rewardId: string, redeemedAt: string, trackingCode: string) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data() as UserProfile;
    const updatedRewards = userData.rewards.map(reward => {
      if (reward.rewardId === rewardId && reward.redeemedAt === redeemedAt) {
        return { ...reward, status: 'shipped' as const, trackingCode: trackingCode };
      }
      return reward;
    });

    await updateDoc(userRef, { rewards: updatedRewards });
  } else {
    throw new Error('User not found');
  }
}

export async function unsubscribeUser(email: string): Promise<{ success: boolean; message?: string }> {
  if (!email) {
    return { success: false, message: 'Email address is required.' };
  }

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    
    // Find user by email
    const userRecord = await adminAuth.getUserByEmail(email);
    const userId = userRecord.uid;

    const userDocRef = doc(adminDb, 'users', userId);
    
    // Update the marketingOptIn flag
    await updateDoc(userDocRef, {
      marketingOptIn: false,
    });

    console.log(`Successfully unsubscribed user: ${email}`);
    return { success: true };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.warn(`Attempted to unsubscribe non-existent user: ${email}`);
      // Return success to avoid leaking information about user existence
      return { success: true, message: 'Your email address was not found in our system.' };
    }
    console.error(`Error unsubscribing user ${email}:`, error);
    return { success: false, message: 'Could not process unsubscribe request.' };
  }
}
