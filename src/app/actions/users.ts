'use server';

import { db } from '@/firebase/config';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';

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
