
'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '@/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import type { RewardTier, AppSettings } from '@/app/actions/settings';

/**
 * Uploads a single file to Firebase Storage with retry logic
 * @param file - The file to upload
 * @param path - The storage path
 * @param maxRetries - Maximum number of retry attempts
 * @returns The download URL of the uploaded file
 */
async function uploadFileWithRetry(
  file: File,
  path: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const storageRef = ref(storage, path);
      
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: 'admin',
          uploadedAt: new Date().toISOString(),
        },
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error: any) {
      lastError = error;
      console.error(`Upload attempt ${attempt + 1} failed:`, error);

      if (error.code === 'storage/unauthorized') {
        throw new Error('Unauthorized. Please ensure you are logged in as an admin with the correct permissions. You may need to follow the ADMIN_SETUP.md guide, then sign out and back in.');
      }

      if (error.code === 'storage/canceled') {
        throw new Error('Upload was canceled.');
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to upload file after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Uploads reward images to Firebase Storage and updates the tier objects with the new URLs.
 * This is a client-side service because it uses the Firebase client SDK for uploads.
 * @param rewardTiers - The array of reward tiers to process.
 * @param imageFiles - A record of reward tier IDs to their corresponding File objects.
 * @returns An updated array of reward tiers with new image URLs for uploaded files.
 */
export async function uploadRewardImages(
  rewardTiers: RewardTier[],
  imageFiles: Record<string, File>
): Promise<RewardTier[]> {
  // Create a deep copy to avoid modifying the original state directly
  const updatedTiers = JSON.parse(JSON.stringify(rewardTiers));

  // Use Promise.all to handle all uploads concurrently
  await Promise.all(
    updatedTiers.map(async (tier: RewardTier) => {
      // Check if the image is a new local file (blob URL) that needs uploading
      if (tier.image && tier.image.startsWith('blob:')) {
        const file = imageFiles[tier.id];

        if (file) {
          const timestamp = Date.now();
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `rewards/${timestamp}_${sanitizedFileName}`;
          
          try {
            const downloadURL = await uploadFileWithRetry(file, path);
            tier.image = downloadURL; // Replace blob URL with permanent URL
          } catch (error: any) {
             console.error(`Failed to upload image for tier "${tier.title}":`, error);
             // Re-throw the specific error to be caught by the calling function.
             throw new Error(`Failed to upload image for "${tier.title}": ${error.message}`);
          }
        } else {
          // This is a safeguard. A blob URL exists, but the file is missing from our state.
          console.warn(`Could not find file for blob URL on tier "${tier.title}". Clearing image.`);
          tier.image = ''; // Prevent saving the invalid blob URL
        }
      }
    })
  );

  return updatedTiers;
}


/**
 * Saves application settings to Firestore from the client.
 * @param settings - The settings object to save.
 */
export async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const settingsRef = doc(db, 'app-settings', 'rewards');
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error("Error updating app settings from client: ", error);
    throw new Error("Failed to update settings in Firestore. Check console and security rules.");
  }
}
