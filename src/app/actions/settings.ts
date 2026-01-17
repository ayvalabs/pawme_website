'use server';

import { db } from '@/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ReferralTier {
  count: number;
  tier: string;
  reward: string;
  icon: string;
}

export interface RewardTier {
  id: string;
  title: string;
  requiredPoints: number;
  reward: string;
  image: string;
  alt: string;
  'data-ai-hint': string;
}

export interface VipConfig {
  totalSpots: number;
}

export interface AppSettings {
  referralTiers: ReferralTier[];
  rewardTiers: RewardTier[];
  vipConfig: VipConfig;
}

const settingsRef = doc(db, 'app-settings', 'rewards');

export async function getAppSettings(): Promise<AppSettings | null> {
  try {
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data() as AppSettings;
    }
    return null;
  } catch (error) {
    console.error("Error getting app settings: ", error);
    return null;
  }
}
