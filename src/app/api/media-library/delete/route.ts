import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { mediaIds } = await request.json();

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'Missing mediaIds array' }, { status: 400 });
    }

    const bucket = admin.storage().bucket();
    let deleted = 0;
    let errors: string[] = [];

    for (const mediaId of mediaIds) {
      try {
        // Get the media doc
        const doc = await adminDb.collection('media-library').doc(mediaId).get();
        if (!doc.exists) {
          errors.push(`${mediaId}: not found`);
          continue;
        }

        const data = doc.data()!;

        // Delete from Firebase Storage if uploaded
        if (data.storagePath) {
          try {
            await bucket.file(data.storagePath).delete();
          } catch (e: any) {
            // File might not exist in storage, that's ok
            if (e.code !== 404) {
              console.warn(`Storage delete warning for ${data.storagePath}:`, e.message);
            }
          }
        }

        // Delete thumbnail from storage if exists
        if (data.thumbnailUrl && data.storagePath) {
          const thumbPath = data.storagePath.replace(/\/[^/]+$/, '/thumbnails/thumb_' + data.storagePath.split('/').pop()?.replace(/\.[^.]+$/, '.jpg'));
          try {
            await bucket.file(thumbPath).delete();
          } catch {}
        }

        // Delete Firestore doc
        await adminDb.collection('media-library').doc(mediaId).delete();
        deleted++;
      } catch (e: any) {
        errors.push(`${mediaId}: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Failed to delete media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media', details: String(error) },
      { status: 500 }
    );
  }
}
