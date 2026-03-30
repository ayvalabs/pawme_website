/**
 * Upload media from Google Drive (WhatsApp export) to Firebase Storage
 * Then update the corresponding Firestore scheduled posts with the Storage URLs
 *
 * Run with: npx tsx scripts/upload-media.ts --media-dir="/path/to/WhatsApp Chat - Rolling Robot - Pawme"
 *
 * This script:
 * 1. Reads all scheduled posts from Firestore
 * 2. For each post with mediaFilePaths, finds the file on disk
 * 3. Uploads it to Firebase Storage under posts-media/
 * 4. Updates the post's mediaUrls with the public Storage URLs
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local (Next.js doesn't load it for standalone scripts)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  let currentKey = '';
  let currentValue = '';
  let inValue = false;

  for (const line of envContent.split('\n')) {
    if (inValue) {
      currentValue += '\n' + line;
      if (
        (currentValue.startsWith("'") && line.trimEnd().endsWith("'")) ||
        (currentValue.startsWith('"') && line.trimEnd().endsWith('"'))
      ) {
        const val = currentValue.slice(1, -1);
        if (!process.env[currentKey]) process.env[currentKey] = val;
        inValue = false;
      }
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    if (
      (value.startsWith("'") && !value.endsWith("'")) ||
      (value.startsWith('"') && !value.endsWith('"'))
    ) {
      currentKey = key;
      currentValue = value;
      inValue = true;
      continue;
    }
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  console.log('✅ Loaded .env.local');
}

// Initialize Firebase
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT env var required');
    process.exit(1);
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const COLLECTION = 'scheduled-posts';

// Default media directory - adjust to your local path
const DEFAULT_MEDIA_DIR = path.join(
  process.env.HOME || '/Users/ashokjaiswal',
  'Library/CloudStorage/GoogleDrive-pawme@ayvalabs.com/My Drive/5. Product/History/WhatsApp Chat - Rolling Robot - Pawme'
);

function getMediaDir(): string {
  const argIndex = process.argv.findIndex(a => a.startsWith('--media-dir='));
  if (argIndex !== -1) {
    return process.argv[argIndex].split('=')[1];
  }
  return DEFAULT_MEDIA_DIR;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.3gp': 'video/3gpp',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

async function uploadFile(
  localPath: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  const fileRef = bucket.file(storagePath);

  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType,
      metadata: {
        originalName: path.basename(localPath),
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  // Generate a signed URL valid for 5 years (uniform bucket-level access doesn't allow makePublic)
  const [signedUrl] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
  });

  return signedUrl;
}

// Additional media search directories (beyond the main WhatsApp chat)
function getAdditionalMediaDirs(): string[] {
  const driveBase = path.join(
    process.env.HOME || '/Users/ashokjaiswal',
    'Library/CloudStorage/GoogleDrive-pawme@ayvalabs.com/My Drive'
  );
  return [
    path.join(driveBase, '1. Marketing/10 - Product Shots'),
    path.join(driveBase, '1. Marketing/08- Agency Shared files/Mockups Robots x Pets'),
    path.join(driveBase, '1. Marketing/08- Agency Shared files/Founder'),
    path.join(driveBase, '1. Marketing/08- Agency Shared files/Pictures products'),
    path.join(driveBase, '5. Product'),
    path.join(driveBase, '7. Patent & Trademark'),
    path.join(driveBase, '2. Technology/App/Screenshots'),
    path.join(driveBase, '10. Base IOA/10. Content/WhatsApp Chat - Pawme - Marketing - Sandy_Ashok'),
    path.join(driveBase, '5. Product/History/WhatsApp Chat - Rolling Robot - Pawme/studio'),
  ].filter(d => fs.existsSync(d));
}

async function main() {
  const mediaDir = getMediaDir();
  const additionalDirs = getAdditionalMediaDirs();

  console.log(`\n📁 Primary media directory: ${mediaDir}`);
  additionalDirs.forEach(d => console.log(`📁 Additional: ${d}`));

  if (!fs.existsSync(mediaDir)) {
    console.error(`\n❌ Media directory not found: ${mediaDir}`);
    console.error('   Use --media-dir="/path/to/media" to specify the correct path');
    process.exit(1);
  }

  // Get all scheduled posts that have mediaFilePaths but empty mediaUrls
  const snapshot = await db.collection(COLLECTION).get();
  const postsToUpdate = snapshot.docs.filter(doc => {
    const data = doc.data();
    return (
      data.mediaFilePaths?.length > 0 &&
      (!data.mediaUrls || data.mediaUrls.length === 0)
    );
  });

  console.log(`\n📋 Found ${postsToUpdate.length} posts with media to upload\n`);

  if (postsToUpdate.length === 0) {
    console.log('✅ All posts already have media URLs. Nothing to do.');
    process.exit(0);
  }

  // Track unique files to avoid re-uploading
  const uploadedFiles: Map<string, string> = new Map(); // filename -> url
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const doc of postsToUpdate) {
    const data = doc.data();
    const mediaUrls: string[] = [];
    const postPreview = data.text?.substring(0, 50) || 'No text';

    console.log(`📝 Processing: "${postPreview}..."`);

    for (const filePath of data.mediaFilePaths) {
      // Extract just the filename from the path
      const filename = path.basename(filePath);

      // Skip non-media files (like PDFs)
      if (filename.endsWith('.pdf') || filename.endsWith('.vcf')) {
        console.log(`   ⏭️  Skipping non-media: ${filename}`);
        totalSkipped++;
        continue;
      }

      // Check if already uploaded
      if (uploadedFiles.has(filename)) {
        console.log(`   ♻️  Reusing: ${filename}`);
        mediaUrls.push(uploadedFiles.get(filename)!);
        continue;
      }

      // Find file on disk — search primary dir first, then additional dirs
      let localPath = path.join(mediaDir, filename);
      if (!fs.existsSync(localPath)) {
        let found = false;
        for (const dir of additionalDirs) {
          const altPath = path.join(dir, filename);
          if (fs.existsSync(altPath)) {
            localPath = altPath;
            found = true;
            break;
          }
        }
        if (!found) {
          console.log(`   ⚠️  File not found: ${filename}`);
          totalFailed++;
          continue;
        }
      }

      // Check file size (skip files > 50MB for now)
      const stats = fs.statSync(localPath);
      if (stats.size > 50 * 1024 * 1024) {
        console.log(`   ⚠️  File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB): ${filename}`);
        totalSkipped++;
        continue;
      }

      try {
        const contentType = getMimeType(filename);
        const storagePath = `posts-media/${filename}`;
        const url = await uploadFile(localPath, storagePath, contentType);
        mediaUrls.push(url);
        uploadedFiles.set(filename, url);
        totalUploaded++;
        console.log(`   ✅ Uploaded: ${filename} (${(stats.size / 1024).toFixed(0)}KB)`);
      } catch (error: any) {
        console.error(`   ❌ Upload failed: ${filename} — ${error.message}`);
        totalFailed++;
      }
    }

    // Update Firestore with media URLs
    if (mediaUrls.length > 0) {
      await doc.ref.update({
        mediaUrls,
        updatedAt: new Date().toISOString(),
      });
      console.log(`   💾 Updated post with ${mediaUrls.length} media URL(s)\n`);
    } else {
      console.log(`   ⏭️  No media uploaded for this post\n`);
    }
  }

  console.log('\n📊 Upload Summary:');
  console.log(`   Uploaded: ${totalUploaded} files`);
  console.log(`   Reused:   ${uploadedFiles.size - totalUploaded} files (deduped)`);
  console.log(`   Skipped:  ${totalSkipped} files`);
  console.log(`   Failed:   ${totalFailed} files`);
  console.log(`   Total unique files in Storage: ${uploadedFiles.size}\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Upload script failed:', error);
  process.exit(1);
});
