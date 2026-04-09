import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { tweetId, updates } = await request.json();

    if (!tweetId || !updates) {
      return NextResponse.json(
        { error: 'Missing tweetId or updates' },
        { status: 400 }
      );
    }

    await adminDb
      .collection('scheduled-posts')
      .doc(tweetId)
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update tweet:', error);
    return NextResponse.json(
      { error: 'Failed to update tweet' },
      { status: 500 }
    );
  }
}
