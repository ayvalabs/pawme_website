import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { tweetId, mediaLibraryIds } = await request.json();

    if (!tweetId || !mediaLibraryIds || mediaLibraryIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing tweetId or mediaLibraryIds' },
        { status: 400 }
      );
    }

    // Fetch media from library
    const mediaPromises = mediaLibraryIds.map((id: string) =>
      adminDb.collection('media-library').doc(id).get()
    );
    const mediaDocs = await Promise.all(mediaPromises);

    const mediaUrls: string[] = [];
    const mediaTypes: string[] = [];
    const mediaFilePaths: string[] = [];

    for (const doc of mediaDocs) {
      if (doc.exists) {
        const data = doc.data();
        if (data?.storageUrl) {
          mediaUrls.push(data.storageUrl);
          mediaTypes.push(data.type);
          mediaFilePaths.push(data.path);
        }
      }
    }

    // Update tweet with media
    await adminDb
      .collection('scheduled-posts')
      .doc(tweetId)
      .update({
        mediaUrls,
        mediaTypes,
        mediaFilePaths,
        mediaLibraryIds,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ success: true, mediaUrls, mediaTypes });
  } catch (error) {
    console.error('Failed to attach media:', error);
    return NextResponse.json(
      { error: 'Failed to attach media' },
      { status: 500 }
    );
  }
}
