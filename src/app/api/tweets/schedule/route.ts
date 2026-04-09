import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { tweetId, status } = await request.json();

    if (!tweetId || !status) {
      return NextResponse.json(
        { error: 'Missing tweetId or status' },
        { status: 400 }
      );
    }

    await adminDb
      .collection('scheduled-posts')
      .doc(tweetId)
      .update({
        status,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update tweet status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
