'use client';

import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { storage } from '@/firebase/config';
import type { RewardTier } from '@/app/actions/settings';

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
        throw new Error('Unauthorized: Please ensure you are logged in as an admin.');
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
      try {
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `rewards/${timestamp}_${sanitizedFileName}`;
        
        const downloadURL = await uploadFileWithRetry(file, path);
        updatedTiers[i].image = downloadURL;
        
        console.log(`Successfully uploaded image for tier ${i}:`, downloadURL);
      } catch (error: any) {
        console.error(`Failed to upload image for tier ${i}:`, error);
        throw new Error(`Failed to upload image for "${updatedTiers[i].title}": ${error.message}`);
      }
    }
  }

  return updatedTiers;
}

/**
 * Uploads a single reward image with progress tracking
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns The download URL of the uploaded file
 */
export async function uploadRewardImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `rewards/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);

  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: 'admin',
      uploadedAt: new Date().toISOString(),
    },
  };

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Upload error:', error);
        
        if (error.code === 'storage/unauthorized') {
          reject(new Error('Unauthorized: Please ensure you are logged in as an admin.'));
        } else if (error.code === 'storage/canceled') {
          reject(new Error('Upload was canceled.'));
        } else {
          reject(new Error(`Upload failed: ${error.message}`));
        }
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error: any) {
          reject(new Error(`Failed to get download URL: ${error.message}`));
        }
      }
    );
  });
}
