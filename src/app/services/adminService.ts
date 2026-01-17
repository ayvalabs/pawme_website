'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/config';
import type { RewardTier } from '@/app/actions/settings';

/**
 * Uploads reward images to Firebase Storage and updates the tier objects with the new URLs.
 * This is a client-side service because it uses the Firebase client SDK for uploads.
 * @param rewardTiers - The array of reward tiers to process.
 * @param imageFiles - The array of files corresponding to each reward tier.
 * @returns An updated array of reward tiers with new image URLs for uploaded files.
 */
export async function uploadRewardImages(
  rewardTiers: RewardTier[],
  imageFiles: (File | null)[]
): Promise<RewardTier[]> {
  const updatedTiers = [...rewardTiers];

  for (let i = 0; i < updatedTiers.length; i++) {
    const file = imageFiles[i];
    if (file) {
      const storageRef = ref(storage, `rewards/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      updatedTiers[i].image = downloadURL;
    }
  }

  return updatedTiers;
}
