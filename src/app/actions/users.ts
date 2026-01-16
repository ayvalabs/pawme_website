
'use server';

import { db } from '@/firebase/config';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { UserProfile, Reward } from '@/app/context/AuthContext';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  rank: number;
}

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
